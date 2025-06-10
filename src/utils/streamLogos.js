/**
 * Utility file to map stream providers to their logos
 */

const streamLogos = {
  'YouTube': require('../../assets/stream-logos/youtube.png'),
  'YouTube Live': require('../../assets/stream-logos/youtube.png'),
  'Twitch': require('../../assets/stream-logos/twitch.png'),
  'TuneIn': require('../../assets/stream-logos/tunein.png'),
  'TuneIn - Audio': require('../../assets/stream-logos/tunein.png'),
  'Spreaker': require('../../assets/stream-logos/spreaker.png'),
  'Spreaker - Audio': require('../../assets/stream-logos/spreaker.png'),
  'Shoutcast': require('../../assets/stream-logos/shoutcast.png'),
  'Shoutcast - Audio': require('../../assets/stream-logos/shoutcast.png'),
  'Kick': require('../../assets/stream-logos/kick.png'),
  'Icecast': require('../../assets/stream-logos/icecast.png'),
  'Icecast - Audio': require('../../assets/stream-logos/icecast.png'),
  'Flosoft': require('../../assets/stream-logos/flosoft.png'),
  'Bit Gravity': require('../../assets/stream-logos/bitgravity.png'),
  'Ustream': require('../../assets/stream-logos/ustream.png'),
  'TWiT Live - Audio': require('../../assets/stream-logos/twit-audio.png'),
  'Default': require('../../assets/stream-logos/default.png'),
};

/**
 * Get the appropriate logo for a stream provider
 * @param {string} providerName - The name of the stream provider
 * @returns {object} - The logo image source
 */
export const getStreamLogo = (providerName) => {
  if (!providerName) return streamLogos.Default;
  return streamLogos[providerName] || streamLogos.Default;
};

export default streamLogos;
