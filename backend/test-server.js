// Quick test script to verify the server setup
// Run: node test-server.js

const http = require('http')

const testHealth = () => {
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:3000/health', (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Health check passed!')
          console.log('Response:', data)
          resolve(true)
        } else {
          console.log('❌ Health check failed with status:', res.statusCode)
          reject(new Error(`Status: ${res.statusCode}`))
        }
      })
    })

    req.on('error', (err) => {
      console.log('❌ Server is not running or not accessible')
      console.log('Error:', err.message)
      console.log('\n💡 Make sure to start the server first:')
      console.log('   cd backend && npm run dev')
      reject(err)
    })

    req.setTimeout(2000, () => {
      req.destroy()
      reject(new Error('Connection timeout'))
    })
  })
}

// Run test
console.log('Testing backend server connection...\n')
testHealth()
  .then(() => {
    console.log('\n✅ Backend server is ready!')
    process.exit(0)
  })
  .catch((err) => {
    console.log('\n❌ Backend server test failed')
    process.exit(1)
  })
