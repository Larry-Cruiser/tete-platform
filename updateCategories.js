// Updated setupDatabase.js with complete categories and subcategories
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function insertCategoriesAndSubcategories() {
    console.log('🎯 Inserting categories and subcategories...');

    const categories = [
        {
            name: 'Football',
            slug: 'football',
            subcategories: ['Nigerian Football', 'European Football', 'African Football', 'Others']
        },
        {
            name: 'Politics',
            slug: 'politics',
            subcategories: ['Nigerian Politics', 'International Politics', 'US Politics', 'Others']
        },
        {
            name: 'Basketball',
            slug: 'basketball',
            subcategories: ['NBA', 'African Basketball', 'European Basketball', 'Others']
        },
        {
            name: 'Entertainment',
            slug: 'entertainment',
            subcategories: ['Nollywood', 'Hollywood', 'Music Awards', 'Others']
        },
        {
            name: 'Esports',
            slug: 'esports',
            subcategories: ['FIFA', 'Call of Duty', 'League of Legends', 'Others']
        },
        {
            name: 'Combat Sports',
            slug: 'combat sports',
            subcategories: ['Boxing', 'UFC', 'Wrestling', 'Others']
        },
        {
            name: 'Reality TV',
            slug: 'reality-tv',
            subcategories: ['Big Brother', 'Talent Shows', 'Awards Shows', 'Others']
        },
        {
            name: 'Current Events',
            slug: 'current-events',
            subcategories: ['Global News', 'Local News', 'Trending Topics', 'Others']
        },
        {
            name: 'Tech',
            slug: 'tech',
            subcategories: ['Product Launches', 'Startup Competitions', 'Tech Trends', 'Others']
        },
        {
            name: 'Custom',
            slug: 'custom',
            subcategories: ['Unique Bets', 'Personal Challenges', 'Miscellaneous', 'Others']
        }
    ];

    // Clear existing data
    await supabase.from('wager_subcategories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('wager_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    for (const category of categories) {
        // Insert category
        const { data: categoryData, error: categoryError } = await supabase
            .from('wager_categories')
            .insert({
                name: category.name,
                slug: category.slug
            })
            .select()
            .single();

        if (categoryError) {
            console.error(`Error inserting category ${category.name}:`, categoryError);
            continue;
        }

        console.log(`✅ Inserted category: ${category.name}`);

        // Insert subcategories
        for (const subcategoryName of category.subcategories) {
            const { error: subError } = await supabase
                .from('wager_subcategories')
                .insert({
                    category_id: categoryData.id,
                    name: subcategoryName,
                    slug: subcategoryName.toLowerCase().replace(/\s+/g, '-')
                });

            if (subError) {
                console.error(`Error inserting subcategory ${subcategoryName}:`, subError);
            }
        }

        console.log(`✅ Inserted ${category.subcategories.length} subcategories for ${category.name}`);
    }

    console.log('✅ All categories and subcategories inserted successfully!');
}

// Run the update
insertCategoriesAndSubcategories()
    .then(() => {
        console.log('✅ Database update completed!');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Error updating database:', error);
        process.exit(1);
    });