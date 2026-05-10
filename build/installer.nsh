; 自定义 NSIS 安装脚本
; 确保安装目录始终包含 PetBuddy 文件夹

!include "FileFunc.nsh"

; 自定义安装模式 - 在用户选择目录后调用
!macro customInstallMode
  ; 检查 $INSTDIR 是否以 PetBuddy 结尾
  ${GetFileName} $INSTDIR $R0
  
  ; 如果不是 PetBuddy，则添加它
  ${If} $R0 != "PetBuddy"
    ; 移除末尾的反斜杠（如果有）
    StrCpy $R1 $INSTDIR 1 -1
    ${If} $R1 == "\"
      StrCpy $INSTDIR $INSTDIR -1
    ${EndIf}
    ; 添加 \PetBuddy
    StrCpy $INSTDIR "$INSTDIR\PetBuddy"
  ${EndIf}
!macroend

!macro customInstall
  DetailPrint "Installing PetBuddy to $INSTDIR"
!macroend

!macro customUnInstall
  DetailPrint "Uninstalling PetBuddy from $INSTDIR"
!macroend
