const fs = require('fs');

async function getCategories() {
  try {
    const env = fs.readFileSync('.env.local', 'utf8');
    const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
    const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

    const response = await fetch(`${url}/rest/v1/restaurants?select=category`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });

    const data = await response.json();
    const categories = [...new Set(data.map(r => r.category))].sort();
    
    console.log('--- 총 ' + categories.length + '개의 카테고리 ---');
    console.log(categories.join('\n'));
  } catch (err) {
    console.error('오류 발생:', err.message);
  }
}

getCategories();
