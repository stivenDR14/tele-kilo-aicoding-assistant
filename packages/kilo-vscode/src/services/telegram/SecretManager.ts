import * as vscode from 'vscode';

/**
 * SecretManager: Wraps vscode.secrets for secure credential storage.
 */
export class SecretManager {
  private static readonly TOKEN_KEY = 'kilocode.telegram.botToken';

  constructor(private context: vscode.ExtensionContext) {}

  async getToken(): Promise<string | undefined> {
    return await this.context.secrets.get(SecretManager.TOKEN_KEY);
  }

  async setToken(token: string): Promise<void> {
    await this.context.secrets.store(SecretManager.TOKEN_KEY, token);
  }

  async deleteToken(): Promise<void> {
    await this.context.secrets.delete(SecretManager.TOKEN_KEY);
  }
}
