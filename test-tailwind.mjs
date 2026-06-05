import { compile } from '@tailwindcss/node'

const result = await compile('@import "tailwindcss";', { base: process.cwd() })
console.log('FEATURES:', result.features)
console.log('Has Utilities:', !!(result.features & 8))
console.log('CSS (first 500 chars):', result.build([]).substring(0, 500))
