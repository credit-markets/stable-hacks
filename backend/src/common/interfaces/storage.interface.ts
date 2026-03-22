export interface IStorageService {
  uploadFile(
    filePath: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string>;
  deleteFile(filePath: string): Promise<void>;
  getFile(filePath: string): Promise<Buffer>;
  getSignedUrl(filePath: string, expiresIn?: number): Promise<string>;
  getFileUrl(filePath: string, expiresInHours?: number): Promise<string>;
  fileExists?(filePath: string): Promise<boolean>;
  getSignedUploadUrl?(
    filePath: string,
    mimeType: string,
    expiresInMinutes?: number,
  ): Promise<string>;
}
