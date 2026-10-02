import type { NextConfig } from "next"

const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
})

module.exports = withPWA({})

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
