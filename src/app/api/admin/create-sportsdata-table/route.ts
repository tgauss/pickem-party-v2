import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST() {
  try {
    // Read the SQL migration file
    const migrationPath = path.join(process.cwd(), 'src/app/api/admin/migrations/create-sportsdata-table.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
    
    // Split into individual statements (Supabase prefers one at a time)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    const results = []
    
    for (const statement of statements) {
      try {
        // Execute each SQL statement
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        })
        
        if (error) {
          console.error('Statement error:', error)
          results.push({ 
            statement: statement.substring(0, 50) + '...', 
            status: 'error',
            error: error.message 
          })
        } else {
          results.push({ 
            statement: statement.substring(0, 50) + '...', 
            status: 'success' 
          })
        }
      } catch (err) {
        results.push({ 
          statement: statement.substring(0, 50) + '...', 
          status: 'error',
          error: String(err)
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'SportsData table migration completed',
      results
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Migration failed',
      details: String(error)
    })
  }
}