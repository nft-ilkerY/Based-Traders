// User Profile Utilities for Farcaster/Base
// Using Farcaster Mini App SDK and public APIs

export async function getUserProfilePhoto(address: string): Promise<string> {
  try {
    // Try Farcaster Neynar API (v2)
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
      {
        headers: {
          'accept': 'application/json',
          'api_key': 'NEYNAR_API_DOCS' // Public demo key
        }
      }
    )

    if (response.ok) {
      const data = await response.json()
      if (data[address]?.[0]?.pfp_url) {
        return data[address][0].pfp_url
      }
    }
  } catch (error) {
    console.log('Farcaster profile not found:', error)
  }

  // Fallback to generated avatar based on address
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`
}

export async function getUserDisplayName(address: string): Promise<string> {
  try {
    // Try Farcaster Neynar API (v2)
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
      {
        headers: {
          'accept': 'application/json',
          'api_key': 'NEYNAR_API_DOCS' // Public demo key
        }
      }
    )

    if (response.ok) {
      const data = await response.json()
      if (data[address]?.[0]?.username) {
        return `@${data[address][0].username}`
      }
      if (data[address]?.[0]?.display_name) {
        return data[address][0].display_name
      }
    }
  } catch (error) {
    console.log('Farcaster username not found:', error)
  }

  // Fallback to shortened address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export async function getUserBio(address: string): Promise<string> {
  try {
    // Try Farcaster Neynar API (v2)
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
      {
        headers: {
          'accept': 'application/json',
          'api_key': 'NEYNAR_API_DOCS' // Public demo key
        }
      }
    )

    if (response.ok) {
      const data = await response.json()
      if (data[address]?.[0]?.profile?.bio?.text) {
        return data[address][0].profile.bio.text
      }
    }
  } catch (error) {
    console.log('Farcaster bio not found:', error)
  }

  return ''
}
