export interface Logger {
  debug(message: string, ...details: unknown[]): void;
  warn(message: string, ...details: unknown[]): void;
  error(message: string, ...details: unknown[]): void;
}

export const consoleLogger: Logger = {
  debug(message, ...details) {
    console.debug(`[shrinkonauts] ${message}`, ...details);
  },
  warn(message, ...details) {
    console.warn(`[shrinkonauts] ${message}`, ...details);
  },
  error(message, ...details) {
    console.error(`[shrinkonauts] ${message}`, ...details);
  },
};

export const silentLogger: Logger = {
  debug() {},
  warn() {},
  error() {},
};
