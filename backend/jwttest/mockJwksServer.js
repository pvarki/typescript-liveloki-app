import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 4000;

const publicKey = fs.readFileSync(path.join(__dirname, 'public.key'), 'utf8');
const jwk = crypto.createPublicKey(publicKey).export({ format: 'jwk' });

const jwks = {
    keys: [
        {
            kty: jwk.kty,
            kid: '1', // Ensure this matches the keyid used in the token
            use: 'sig',
            alg: 'RS256',
            n: jwk.n,
            e: jwk.e
        }
    ]
};

app.get('/realms/:realm/protocol/openid-connect/certs', (req, res) => {
    res.json(jwks);
});

app.listen(port, () => {
    console.log(`Mock JWKS Server running at http://localhost:${port}`);
});