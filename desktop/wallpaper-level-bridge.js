'use strict';
// macOS NSWindow 私有 API 桥接（基于 koffi）
// 通过 objc_msgSend 调用 [NSWindow setLevel:] 把窗口置于桌面层（kCGDesktopWindowLevel）
// 失败时返回 false，主进程会 fallback 到 setAlwaysOnTop
//
// 历史坑点（已修复）：
// 1. objc_msgSend 是变参函数，但 koffi 无法推断变参 "..." 的实参类型，
//    会抛 "Missing value argument for variadic call"。
//    解决：为每个 selector 声明具体的非变参签名。
// 2. win.getNativeWindowHandle() 返回 Buffer，其「内容」才是地址（小端）。
//    直接把 Buffer 传给 void* 参数，koffi 会用 buffer 的数据地址而不是句柄值。
//    解决：用 readBigUInt64LE 读出地址（BigInt），koffi 3.x 用 BigInt 表示不透明指针。
// 3. getNativeWindowHandle() 在 macOS 上返回的是 NSView（BridgedContentView），
//    不是 NSWindow！直接对 NSView 调 setLevel: 会抛
//    "-[BridgedContentView setLevel:]: unrecognized selector"。
//    解决：先通过 [NSView window] 取到 NSWindow，再对 NSWindow 调 setLevel:。

let loaded = false;
let bridge = null;

function tryLoadWithKoffi() {
  try {
    const koffi = require('koffi');
    // 加载 libobjc 和 AppKit（NSWindow 类在 AppKit 里）
    const objc = koffi.load('libobjc.A.dylib');
    try {
      koffi.load('/System/Library/Frameworks/AppKit.framework/AppKit');
    } catch (e) {
      // AppKit 加载失败不致命，类可能已经通过其他途径可用
      console.warn('[wallpaper-bridge] AppKit load warning:', e.message);
    }
    // 关键：不能用变参 '...' 声明 objc_msgSend，必须为每个 selector 给出具体签名
    // - window（无参，返回 NSWindow*）用于从 NSView 取到 NSWindow
    // - setLevel: 参数是 NSInteger，64 位 macOS 上即 long
    // - orderFrontRegardless 无参数
    // - orderOut: 参数是 id（sender，传 nil 即可），用于把窗口移出屏幕
    return {
      sel_registerName: objc.func('void *sel_registerName(const char *name)'),
      objc_getClass: objc.func('void *objc_getClass(const char *name)'),
      msgSendGetPtr: objc.func('void *objc_msgSend(void *receiver, void *sel)'),
      msgSendSetLevel: objc.func('void objc_msgSend(void *receiver, void *sel, long level)'),
      msgSendNoArgs: objc.func('void objc_msgSend(void *receiver, void *sel)'),
      msgSendOrderOut: objc.func('void objc_msgSend(void *receiver, void *sel, void *sender)'),
      // setCollectionBehavior: 参数 NSWindowCollectionBehavior 是 NSUInteger（64 位 unsigned long）
      msgSendSetCollectionBehavior: objc.func('void objc_msgSend(void *receiver, void *sel, unsigned long behavior)'),
    };
  } catch (e) {
    console.warn('[wallpaper-bridge] koffi load failed:', e.message);
    return null;
  }
}

function loadObjc() {
  if (loaded) return bridge;
  if (process.platform !== 'darwin') {
    loaded = true;
    return null;
  }
  bridge = tryLoadWithKoffi();
  if (!bridge) {
    console.warn('[wallpaper-bridge] no FFI available; will use setAlwaysOnTop fallback');
  }
  loaded = true;
  return bridge;
}

// getNativeWindowHandle() 返回 Buffer，内容是 NSWindow 地址（小端）
// koffi 3.x 用 BigInt 表示不透明指针，需要把地址读出来再传给 void* 参数
function readNativeHandle(nativeHandle) {
  if (!nativeHandle) return null;
  try {
    if (typeof nativeHandle === 'bigint') return nativeHandle;
    if (Buffer.isBuffer(nativeHandle)) {
      if (nativeHandle.length >= 8) return nativeHandle.readBigUInt64LE(0);
      if (nativeHandle.length >= 4) return BigInt(nativeHandle.readUInt32LE(0));
    }
    if (typeof nativeHandle === 'number') return BigInt(nativeHandle);
  } catch (e) {
    console.warn('[wallpaper-bridge] readNativeHandle failed:', e.message);
  }
  return null;
}

function setNSWindowLevel(nativeHandle, level) {
  const b = loadObjc();
  if (!b) return false;
  // 重要：getNativeWindowHandle() 在 macOS 上返回的是 NSView（BridgedContentView），
  // 不是 NSWindow！setLevel: 是 NSWindow 的方法，必须先通过 [NSView window] 取到 NSWindow。
  const nsView = readNativeHandle(nativeHandle);
  if (!nsView) return false;
  try {
    const sel_window = b.sel_registerName('window');
    const sel_setLevel = b.sel_registerName('setLevel:');
    const sel_orderFrontRegardless = b.sel_registerName('orderFrontRegardless');
    if (!sel_window || !sel_setLevel || !sel_orderFrontRegardless) {
      console.warn('[wallpaper-bridge] sel_registerName returned null');
      return false;
    }
    // [nsView window] → NSWindow*
    const nsWindow = b.msgSendGetPtr(nsView, sel_window);
    if (!nsWindow) {
      console.warn('[wallpaper-bridge] [NSView window] returned null');
      return false;
    }
    console.log('[wallpaper-bridge] setLevel:', level, 'nsWindow=', nsWindow.toString());
    // [NSWindow setLevel: level] —— setLevel: 参数为 NSInteger（64 位即 long）
    // level 是负数（kCGDesktopWindowLevel），JS number 在安全整数范围内，koffi 会正确符号扩展
    b.msgSendSetLevel(nsWindow, sel_setLevel, level);
    b.msgSendNoArgs(nsWindow, sel_orderFrontRegardless);
    return true;
  } catch (e) {
    console.warn('[wallpaper-bridge] setNSWindowLevel failed:', e.message);
    return false;
  }
}

// 设置 NSWindow collectionBehavior，控制窗口的 Space 归属。
// 关键用途：让壁纸窗口绑定到所有非全屏 Space（CanJoinAllSpaces | Stationary），
// 不进入全屏主窗口所在的 Space（不设 FullScreenAuxiliary），
// 这样 desktop-level 窗口不会与全屏 Space 冲突导致闪退。
// 必须在窗口 orderFront/show 之前调用，否则窗口可能在默认 Space（全屏 Space）短暂出现。
// 返回 true 表示调用成功。
function setCollectionBehavior(nativeHandle, behavior) {
  const b = loadObjc();
  if (!b) return false;
  const nsView = readNativeHandle(nativeHandle);
  if (!nsView) return false;
  try {
    const sel_window = b.sel_registerName('window');
    const sel_setCollectionBehavior = b.sel_registerName('setCollectionBehavior:');
    if (!sel_window || !sel_setCollectionBehavior) {
      console.warn('[wallpaper-bridge] setCollectionBehavior: sel_registerName returned null');
      return false;
    }
    const nsWindow = b.msgSendGetPtr(nsView, sel_window);
    if (!nsWindow) {
      console.warn('[wallpaper-bridge] setCollectionBehavior: [NSView window] returned null');
      return false;
    }
    b.msgSendSetCollectionBehavior(nsWindow, sel_setCollectionBehavior, behavior);
    return true;
  } catch (e) {
    console.warn('[wallpaper-bridge] setCollectionBehavior failed:', e.message);
    return false;
  }
}

// 桌面级窗口（kCGDesktopWindowLevel）对 Electron 的 destroy()/close() 不敏感，
// 需要先调用 [NSWindow orderOut:nil] 把窗口移出屏幕，再重置层级到 normal(0)，
// 最后 Electron 才能真正 destroy。
// 返回 true 表示 orderOut 成功调用（不代表窗口一定已消失，但 WindowServer 会把它移出桌面层）。
function orderOutNSWindow(nativeHandle) {
  const b = loadObjc();
  if (!b) return false;
  const nsView = readNativeHandle(nativeHandle);
  if (!nsView) return false;
  try {
    const sel_window = b.sel_registerName('window');
    const sel_orderOut = b.sel_registerName('orderOut:');
    if (!sel_window || !sel_orderOut) {
      console.warn('[wallpaper-bridge] orderOut: sel_registerName returned null');
      return false;
    }
    const nsWindow = b.msgSendGetPtr(nsView, sel_window);
    if (!nsWindow) {
      console.warn('[wallpaper-bridge] orderOut: [NSView window] returned null');
      return false;
    }
    // [NSWindow orderOut:nil] —— sender 传 null（nil）
    b.msgSendOrderOut(nsWindow, sel_orderOut, null);
    return true;
  } catch (e) {
    console.warn('[wallpaper-bridge] orderOutNSWindow failed:', e.message);
    return false;
  }
}

module.exports = {
  setNSWindowLevel,
  setCollectionBehavior,
  orderOutNSWindow,
  available: () => !!loadObjc(),
  mode: 'native-bridge'
};
