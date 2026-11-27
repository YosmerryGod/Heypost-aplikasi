#!/usr/bin/env bash
# [ADDED] Local Android Emulator preview launcher for HeyPost.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
SDK_ROOT="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"

resolve_tool() {
  local tool_name="$1"
  local sdk_relative_path="$2"
  if command -v "$tool_name" >/dev/null 2>&1; then
    command -v "$tool_name"
    return 0
  fi
  if [[ -n "$SDK_ROOT" && -x "$SDK_ROOT/$sdk_relative_path" ]]; then
    printf '%s\n' "$SDK_ROOT/$sdk_relative_path"
    return 0
  fi
  return 1
}

ADB="$(resolve_tool adb "platform-tools/adb")" || {
  echo "Android SDK Platform-Tools belum ditemukan. Atur ANDROID_HOME/ANDROID_SDK_ROOT dan PATH."
  exit 1
}

EMULATOR=""
if EMULATOR="$(resolve_tool emulator "emulator/emulator")"; then :; fi

has_online_device() {
  "$ADB" devices | awk 'NR > 1 && $2 == "device" { found = 1 } END { exit !found }'
}

if ! has_online_device; then
  if [[ -z "$EMULATOR" ]]; then
    echo "Emulator belum berjalan dan executable emulator tidak ditemukan."
    echo "Buka Android Studio > Device Manager, lalu jalankan satu Android Virtual Device."
    exit 1
  fi

  AVD_NAME="${ANDROID_AVD_NAME:-}"
  if [[ -z "$AVD_NAME" ]]; then
    mapfile -t AVAILABLE_AVDS < <("$EMULATOR" -list-avds)
    if [[ "${#AVAILABLE_AVDS[@]}" -eq 1 ]]; then
      AVD_NAME="${AVAILABLE_AVDS[0]}"
    elif [[ "${#AVAILABLE_AVDS[@]}" -gt 1 ]]; then
      echo "Ada beberapa AVD. Jalankan emulator dari Android Studio atau set ANDROID_AVD_NAME."
      printf 'AVD tersedia: %s\n' "${AVAILABLE_AVDS[@]}"
      exit 1
    else
      echo "Belum ada Android Virtual Device. Buat AVD melalui Android Studio > Device Manager."
      exit 1
    fi
  fi

  echo "Menjalankan Android Emulator: $AVD_NAME"
  nohup "$EMULATOR" -avd "$AVD_NAME" >/tmp/heypost-android-emulator.log 2>&1 &
  "$ADB" wait-for-device
  for attempt in $(seq 1 120); do
    BOOT_COMPLETED="$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
    if [[ "$BOOT_COMPLETED" == "1" ]]; then break; fi
    if [[ "$attempt" -eq 120 ]]; then
      echo "Android Emulator belum selesai boot dalam 4 menit."
      exit 1
    fi
    sleep 2
  done
fi

cd "$PROJECT_ROOT"
echo "Menjalankan HeyPost pada Android Emulator..."
npx --yes @expo/agent-cli@latest run:android
