import test from 'node:test';
import assert from 'node:assert/strict';
import { isRobotsAllowed } from '../src/core/robots.js';
const policy=`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /profile/listings/\nAllow: /profile/listings/public$`;
test('robots allows public indexes and listings',()=>{assert.equal(isRobotsAllowed(policy,'https://example.test/categories/paragliders'),true);assert.equal(isRobotsAllowed(policy,'https://example.test/listings/wing-123'),true);});
test('robots blocks private paths and honors longer allow',()=>{assert.equal(isRobotsAllowed(policy,'https://example.test/admin/users'),false);assert.equal(isRobotsAllowed(policy,'https://example.test/profile/listings/create'),false);assert.equal(isRobotsAllowed(policy,'https://example.test/profile/listings/public'),true);});
