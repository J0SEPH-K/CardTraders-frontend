// Debug test to check what's being exported from client.ts
import * as client from './src/api/client';

console.log('All exports from client:', Object.keys(client));
console.log('acceptTermsAndConditions type:', typeof client.acceptTermsAndConditions);
console.log('acceptTermsAndConditions:', client.acceptTermsAndConditions);
