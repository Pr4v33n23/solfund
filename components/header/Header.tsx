import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Link from 'next/link'
import React from 'react'

export const Header = () => {
  return (
    <header className="flex justify-between bg-black p-4 outline-none drop-shadow-2xl">
      <div className="flex items-center space-x-5">
        <div className="flex items-center space-x-5 text-white">
          <Link href="/">
            <h2 className="cursor-pointer  bg-gradient-to-br from-teal-400 via-indigo-400 to-purple-400 bg-clip-text px-4 py-2 text-xl font-bold text-transparent">
              SOLFUND
            </h2>
          </Link>
          <h3 className="border border-sky-400 py-2 px-3 font-semibold hover:text-teal-200">
            Fundings
          </h3>
          <h3 className="border border-sky-400 py-2 px-3 font-semibold hover:text-teal-200">
            Campaigns
          </h3>
        </div>
      </div>

      <div className='flex items-center justify-between space-x-5'>
        <Link href="/campaign">
          <button className="border border-sky-400 py-2 px-3 font-semibold text-white hover:text-teal-200">
            <span>Create Campaign</span>
          </button>
        </Link>
        <WalletMultiButton/>
      </div>

    </header>
  )
}
