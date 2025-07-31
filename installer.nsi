# Desktop Todo 安装程序脚本
# 使用 NSIS 3.11+

!define APP_NAME "Desktop Todo"
!define APP_VERSION "1.0.1"
!define APP_PUBLISHER "Desktop Todo Team"
!define APP_URL "https://github.com/Mythjang/PC-ToDoList"
!define APP_EXE "desktop-todo.exe"
!define APP_ICON "desktop-todo-win32-x64\resources\app\assets\256x256.ico"

# 安装程序属性
Name "${APP_NAME}"
OutFile "Desktop-Todo-Setup-v${APP_VERSION}.exe"
InstallDir "$PROGRAMFILES\${APP_NAME}"
InstallDirRegKey HKLM "Software\${APP_NAME}" "InstallDir"
RequestExecutionLevel admin

# 现代界面
!include "MUI2.nsh"

# 界面设置
!define MUI_ABORTWARNING
!define MUI_ICON "${APP_ICON}"
!define MUI_UNICON "${APP_ICON}"

# 安装页面
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "desktop-todo-win32-x64\LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

# 卸载页面
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

# 语言
!insertmacro MUI_LANGUAGE "SimpChinese"
!insertmacro MUI_LANGUAGE "English"

# 版本信息
VIProductVersion "1.0.1.0"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "ProductName" "${APP_NAME}"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "Comments" "桌面待办事项应用程序"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "CompanyName" "${APP_PUBLISHER}"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "LegalCopyright" "© 2024 ${APP_PUBLISHER}"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "FileDescription" "${APP_NAME} 安装程序"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "FileVersion" "${APP_VERSION}"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "ProductVersion" "${APP_VERSION}"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "InternalName" "${APP_NAME}"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "LegalTrademarks" ""
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "OriginalFilename" "Desktop-Todo-Setup-v${APP_VERSION}.exe"

# 安装部分
Section "主程序" SecMain
  SectionIn RO
  
  # 设置输出路径
  SetOutPath "$INSTDIR"
  
  # 复制所有文件
  File /r "desktop-todo-win32-x64\*.*"
  
  # 写入注册表
  WriteRegStr HKLM "Software\${APP_NAME}" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "Software\${APP_NAME}" "Version" "${APP_VERSION}"
  
  # 写入卸载信息
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayIcon" "$INSTDIR\${APP_EXE}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "Publisher" "${APP_PUBLISHER}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "URLInfoAbout" "${APP_URL}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayVersion" "${APP_VERSION}"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoRepair" 1
  
  # 创建卸载程序
  WriteUninstaller "$INSTDIR\uninstall.exe"
  
SectionEnd

# 快捷方式部分
Section "桌面快捷方式" SecDesktop
  CreateShortCut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0
SectionEnd

Section "开始菜单快捷方式" SecStartMenu
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\卸载 ${APP_NAME}.lnk" "$INSTDIR\uninstall.exe"
SectionEnd

# 描述
LangString DESC_SecMain ${LANG_SIMPCHINESE} "安装 ${APP_NAME} 主程序文件"
LangString DESC_SecDesktop ${LANG_SIMPCHINESE} "在桌面创建快捷方式"
LangString DESC_SecStartMenu ${LANG_SIMPCHINESE} "在开始菜单创建快捷方式"

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecMain} $(DESC_SecMain)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop} $(DESC_SecDesktop)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecStartMenu} $(DESC_SecStartMenu)
!insertmacro MUI_FUNCTION_DESCRIPTION_END

# 卸载部分
Section "Uninstall"
  
  # 停止可能运行的程序
  ExecWait 'taskkill /F /IM "${APP_EXE}" /T' $0
  
  # 删除文件
  RMDir /r "$INSTDIR"
  
  # 删除快捷方式
  Delete "$DESKTOP\${APP_NAME}.lnk"
  RMDir /r "$SMPROGRAMS\${APP_NAME}"
  
  # 删除注册表项
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
  DeleteRegKey HKLM "Software\${APP_NAME}"
  
SectionEnd

# 安装完成后的操作
Function .onInstSuccess
  MessageBox MB_YESNO "安装完成！是否立即运行 ${APP_NAME}？" IDNO NoRun
    Exec '"$INSTDIR\${APP_EXE}"'
  NoRun:
FunctionEnd