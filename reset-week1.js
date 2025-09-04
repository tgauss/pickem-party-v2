// Reset week 1 picks to hidden using the new API endpoint
const resetWeek1Picks = async () => {
  try {
    console.log('Resetting week 1 picks to hidden...')
    
    const response = await fetch('https://www.pickemparty.app/api/admin/hide-picks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leagueId: 'bd4aebfd-8e2a-4c13-8dd8-bcbb4bcb26bb', // GRID2025 league ID
        week: 1,
        userId: '6f34ce55-d627-4ada-a8da-c3e7c5bc62c6' // Super admin user
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log('✅', result.message)
      console.log('League:', result.data.league_name)
      console.log('Current revealed weeks:', result.data.revealed_weeks)
      console.log('Week 1 picks are now hidden - new members can join!')
    } else {
      console.log('❌ Failed:', result.error)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

resetWeek1Picks()