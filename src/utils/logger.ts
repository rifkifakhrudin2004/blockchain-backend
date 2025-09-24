import fs from 'fs';
import path from 'path';

export class Logger {
  private static logDir = path.join(__dirname, '../../logs');

  static {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  static log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    console.log(logMessage);
    
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }

    // Write to file
    const logFile = path.join(this.logDir, `${level}.log`);
    const fullMessage = data 
      ? `${logMessage}\n${JSON.stringify(data, null, 2)}\n\n`
      : `${logMessage}\n\n`;
    
    fs.appendFileSync(logFile, fullMessage);
  }

  static info(message: string, data?: any) {
    this.log('info', message, data);
  }

  static warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  static error(message: string, data?: any) {
    this.log('error', message, data);
  }
}