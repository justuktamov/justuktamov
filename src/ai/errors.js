// AI xatosi: foydalanuvchiga ko'rsatiladigan xabar (kalit va ichki tafsilotlarsiz); retry — qayta urinib ko'rsa bo'ladi
export class AiError extends Error {
  constructor(message, { retry = false } = {}) {
    super(message);
    this.retry = retry;
  }
}
