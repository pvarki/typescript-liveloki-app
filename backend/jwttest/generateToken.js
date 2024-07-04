import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const privateKey = fs.readFileSync(path.join(__dirname, 'private.key'), 'utf8');

const payload = {
    sub: '1234567890',
    name: 'John Doe',
    admin: true,
    iss: 'http://jwks:4000/realms/your-realm',
    aud: 'your-client-id'
};

const token = jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: '1h',
    keyid: '1'
});

console.log(token);