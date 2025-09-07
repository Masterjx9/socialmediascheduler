# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['C:/Users/RKerrigan/content_scheduler/socialmediascheduler/manage.py'],
    pathex=['C:\\Users\\RKerrigan\\content_scheduler\\socialmediascheduler\\gui', 'C:/Users/RKerrigan/content_scheduler/socialmediascheduler/scheduler', 'C:/Users/RKerrigan/content_scheduler\\socialmediascheduler\\controller'],
    binaries=[],
    datas=[],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='manage',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['C:\\Users\\RKerrigan\\content_scheduler\\socialmediascheduler\\logo.ico'],
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='manage',
)
