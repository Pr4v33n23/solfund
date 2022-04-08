import type { NextPage } from 'next'
import React from 'react'

import { Header } from '../components/header/Header'

// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css')

const Home: NextPage = () => {
  return <Header />
}

export default Home
