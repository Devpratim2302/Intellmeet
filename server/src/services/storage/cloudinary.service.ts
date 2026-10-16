import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { config } from '../../config/env.js';

export interface UploadResult {
  url: string;
  publicId: string;
}

export interface IFileStorageProvider {
  isAvailable(): boolean;
  uploadAvatar(buffer: Buffer, mimetype: string, userId: string): Promise<UploadResult>;
  deleteAsset(publicId: string): Promise<boolean>;
}

export class CloudinaryStorageService implements IFileStorageProvider {
  private isConfigured = false;
  private mockStore = new Map<string, { buffer: Buffer; mimetype: string }>();

  constructor() {
    this.initCloudinary();
  }

  private initCloudinary(): void {
    const { cloudName, apiKey, apiSecret } = config.cloudinary;
    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.isConfigured = true;
      console.log(`[CloudinaryStorage] Initialized Cloudinary SDK with cloud: ${cloudName}`);
    } else {
      this.isConfigured = false;
      console.log('[CloudinaryStorage] Cloudinary credentials not provided. Active mock storage fallback enabled.');
    }
  }

  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Uploads an avatar image for a user.
   * If real Cloudinary credentials exist, uses Cloudinary uploader stream.
   * Otherwise uses mock storage for zero-cost testing and local evaluation.
   */
  async uploadAvatar(buffer: Buffer, mimetype: string, userId: string): Promise<UploadResult> {
    if (!buffer || buffer.length === 0) {
      throw new Error('Avatar upload buffer cannot be empty.');
    }

    if (this.isConfigured) {
      return new Promise<UploadResult>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'intellmeet/avatars',
            public_id: `avatar_${userId}_${Date.now()}`,
            overwrite: true,
            resource_type: 'image',
            transformation: [
              { width: 256, height: 256, crop: 'fill', gravity: 'face' },
              { quality: 'auto', fetch_format: 'auto' },
            ],
          },
          (error, result) => {
            if (error || !result) {
              return reject(new Error(`Cloudinary upload failed: ${error?.message || 'Unknown error'}`));
            }
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          }
        );

        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
      });
    }

    // Mock storage fallback
    const mockPublicId = `mock_avatar_${userId}_${Date.now()}`;
    const extension = mimetype.split('/')[1] || 'png';
    const mockUrl = `https://res.cloudinary.com/intellmeet/image/upload/v1729000000/intellmeet/avatars/${mockPublicId}.${extension}`;

    this.mockStore.set(mockPublicId, { buffer, mimetype });
    console.log(`[CloudinaryStorage Mock] Stored avatar mock asset: ${mockPublicId}`);

    return {
      url: mockUrl,
      publicId: mockPublicId,
    };
  }

  /**
   * Deletes an asset from Cloudinary or mock store
   */
  async deleteAsset(publicId: string): Promise<boolean> {
    if (!publicId) return false;

    if (this.isConfigured) {
      try {
        const result = await cloudinary.uploader.destroy(publicId, {
          resource_type: 'image',
        });
        return result.result === 'ok';
      } catch (err: any) {
        console.error(`[CloudinaryStorage] Failed to delete asset ${publicId}:`, err.message);
        return false;
      }
    }

    // Mock cleanup
    const existed = this.mockStore.delete(publicId);
    console.log(`[CloudinaryStorage Mock] Deleted avatar mock asset: ${publicId} (existed: ${existed})`);
    return true;
  }
}

export const cloudinaryStorage = new CloudinaryStorageService();
