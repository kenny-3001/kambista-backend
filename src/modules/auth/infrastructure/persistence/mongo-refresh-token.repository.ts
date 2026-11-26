import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RefreshToken } from '../../domain/refresh-token';
import { RefreshTokenRepository } from '../../domain/refresh-token.repository';
import { RefreshTokenDocument } from './refresh-token.schema';

@Injectable()
export class MongoRefreshTokenRepository extends RefreshTokenRepository {
  constructor(
    @InjectModel(RefreshTokenDocument.name)
    private readonly tokenModel: Model<RefreshTokenDocument>,
  ) {
    super();
  }

  async save(token: RefreshToken): Promise<void> {
    await this.tokenModel.create(toDocument(token));
  }

  async consume(tokenHash: string, now: Date): Promise<RefreshToken | null> {
    // The conditions and the update run as one atomic operation.
    const document = await this.tokenModel
      .findOneAndUpdate(
        {
          tokenHash,
          usedAt: null,
          revokedAt: null,
          expiresAt: { $gt: now },
        },
        { $set: { usedAt: now } },
        { new: true },
      )
      .lean<RefreshTokenDocument>()
      .exec();
    return document ? toDomain(document) : null;
  }

  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const document = await this.tokenModel
      .findOne({ tokenHash })
      .lean<RefreshTokenDocument>()
      .exec();
    return document ? toDomain(document) : null;
  }

  async revokeFamily(familyId: string, now: Date): Promise<void> {
    await this.tokenModel
      .updateMany({ familyId, revokedAt: null }, { $set: { revokedAt: now } })
      .exec();
  }

  async revokeAllForUser(userId: string, now: Date): Promise<void> {
    await this.tokenModel
      .updateMany({ userId, revokedAt: null }, { $set: { revokedAt: now } })
      .exec();
  }
}

function toDocument(token: RefreshToken): RefreshTokenDocument {
  return {
    _id: token.id,
    userId: token.userId,
    familyId: token.familyId,
    tokenHash: token.tokenHash,
    createdAt: token.createdAt,
    expiresAt: token.expiresAt,
    usedAt: token.usedAt,
    revokedAt: token.revokedAt,
  };
}

function toDomain(document: RefreshTokenDocument): RefreshToken {
  return RefreshToken.restore({
    id: document._id,
    userId: document.userId,
    familyId: document.familyId,
    tokenHash: document.tokenHash,
    createdAt: document.createdAt,
    expiresAt: document.expiresAt,
    usedAt: document.usedAt ?? null,
    revokedAt: document.revokedAt ?? null,
  });
}
