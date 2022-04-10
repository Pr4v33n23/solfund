import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Link from 'next/link'
import React from 'react'
require('@solana/wallet-adapter-react-ui/styles.css')

export const Header = () => {
  return (
    <header className="flex flex-col items-center justify-between bg-black p-4 outline-none drop-shadow-2xl md:flex-row ">
      <div className="flex items-center space-x-5">
        <div className="flex items-center space-x-5 text-white">
          <Link href="/">
            <h2 className="flex cursor-pointer items-center bg-gradient-to-br from-teal-400 via-indigo-400 to-purple-400 bg-clip-text px-4 py-2 text-2xl font-bold text-transparent">
              <img src="/solana-sol-logo.png" width={50} height={50} />
              SOLFUND
            </h2>
          </Link>
          <Link href="/">
            <h3 className="hidden border border-sky-400 py-2 px-3 font-semibold hover:text-teal-200 lg:inline-flex">
              Campaigns
            </h3>
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between space-x-5">
        <Link href="/campaign">
          <button className="border border-sky-400 px-4 py-2  font-semibold text-white hover:text-teal-200 md:p-2 ">
            <span className="text-sm md:text-base">New Campaign</span>
          </button>
        </Link>
        <WalletMultiButton />
      </div>
    </header>
  )
}
