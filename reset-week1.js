// Reset week 1 picks to hidden using the new API endpoint
const resetWeek1Picks = async () => {
  try {
    console.log('Resetting week 1 picks to hidden...')
    
    const response = await fetch('https://www.pickemparty.app/api/admin/simulate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'hide-week-1'
      })
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers))
    
    const responseText = await response.text()
    console.log('Response body:', responseText)
    
    if (!responseText) {
      console.log('❌ Empty response from server')
      return
    }
    
    try {
      const result = JSON.parse(responseText)
      
      if (result.success) {
        console.log('✅', result.message)
        console.log('League:', result.data.league_name)
        console.log('Previous revealed weeks:', result.data.previous_revealed_weeks)
        console.log('Updated revealed weeks:', result.data.updated_revealed_weeks)
      } else {
        console.log('❌ Failed:', result.error)
      }
    } catch (jsonError) {
      console.log('❌ Failed to parse JSON response:', jsonError.message)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

resetWeek1Picks()