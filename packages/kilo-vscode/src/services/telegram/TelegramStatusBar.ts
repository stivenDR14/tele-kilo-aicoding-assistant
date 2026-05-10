import * as vscode from 'vscode';

/**
 * TelegramStatusBar: Manages the connection status bar item.
 */
export class TelegramStatusBar {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.text = '$(broadcast) Telegram';
    this.statusBarItem.tooltip = 'Telegram: Disconnected';
    this.statusBarItem.show();
  }

  setConnected(state: 'on' | 'off' | 'error') {
    switch (state) {
      case 'on':
        this.statusBarItem.text = '$(broadcast) Telegram: Connected';
        this.statusBarItem.backgroundColor = undefined;
        break;
      case 'off':
        this.statusBarItem.text = '$(broadcast) Telegram: Disconnected';
        this.statusBarItem.backgroundColor = undefined;
        break;
      case 'error':
        this.statusBarItem.text = '$(broadcast) Telegram: Error';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;
    }
  }

  dispose() {
    this.statusBarItem.dispose();
  }
}
