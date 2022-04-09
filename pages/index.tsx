import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js'
import { deserialize } from 'borsh'
import type { NextPage } from 'next'
import Head from 'next/head'
import React, { useEffect, useState } from 'react'

import { Header } from '../components/header/Header'

// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css')

class CampaignDetails {
  name: string
  description: string
  image_link: string
  admin: Buffer
  amount_donated: number

  constructor()
  constructor(
    name?: string,
    description?: string,
    image_link?: string,
    admin?: Buffer,
    amount_donated?: number
  ) {
    ;(this.name = name!),
      (this.description = description!),
      (this.image_link = image_link!),
      (this.admin = admin!),
      (this.amount_donated = amount_donated!)
  }

  static schema: any = new Map([
    [
      CampaignDetails,
      {
        kind: 'struct',
        fields: [
          ['admin', [32]],
          ['name', 'string'],
          ['description', 'string'],
          ['image_link', 'string'],
          ['amount_donated', 'u64'],
        ],
      },
    ],
  ])
}

interface ICampaignData {
  pubId: PublicKey
  name: string
  description: string
  image_link: string
  amount_donated: number
  admin: Buffer
}

const Home: NextPage = () => {
  const { connection } = useConnection()
  const { publicKey, signTransaction, connected } = useWallet()

  const [allCampaigns, setAllCampaigns] = useState([] as any)
  const [amount, setAmount] = useState(0)

  useEffect(() => {
    const campaigns = async () => {
      const onChainCampaigns = await getAllCampaigns()
      console.log(onChainCampaigns)
      setAllCampaigns(onChainCampaigns)
    }

    campaigns()
  }, [])

  //TODO env variable not working
  const programId = new PublicKey(
    '2y6yyVPyRDcKiz9wSRpnEAFUQHusWMbvatAFeSREhvzM'
  )
  const getAllCampaigns = async () => {
    let accounts = await connection.getProgramAccounts(programId)
    let campaigns = [] as any
    accounts.forEach((x) => {
      //! deserializer issue, raised a issue request.
      try {
        let campaignData = deserialize(
          CampaignDetails.schema,
          //@ts-ignore
          CampaignDetails,
          x.account.data
        )

        campaigns.push({
          pubId: x.pubkey,

          //@ts-ignore
          name: campaignData.name.name,
          //@ts-ignore

          description: campaignData.name.description,
          //@ts-ignore

          image_link: campaignData.name.image_link,
          //@ts-ignore

          amount_donated: campaignData.name.amount_donated,
          //@ts-ignore

          admin: campaignData.name.admin,
        })
      } catch (err) {
        console.error(err)
      }
    })
    return campaigns
  }

  const donateToCampaign = async (campaignPubKey: any, amount: any) => {
    const SEED_PRHASE = 'abcdef' + Math.random().toString()

    //creating an account to contain the data of the campaign
    let newAccount = await PublicKey.createWithSeed(
      publicKey!,
      SEED_PRHASE,
      programId
    )

    const createProgramAccount = SystemProgram.createAccountWithSeed({
      fromPubkey: publicKey!,
      basePubkey: publicKey!,
      seed: SEED_PRHASE,
      newAccountPubkey: newAccount,
      lamports: amount,
      space: 1,
      programId: programId,
    })

    const instructionToOurProgram = new TransactionInstruction({
      keys: [
        { pubkey: newAccount, isSigner: false, isWritable: true },
        { pubkey: publicKey!, isSigner: true, isWritable: true },
        { pubkey: campaignPubKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: new Uint8Array([2]) as Buffer,
    })
  }

  return (
    <div>
      <Header />
      <div className=" grid grid-cols-1 gap-3 p-2 sm:grid-cols-2 md:gap-6 md:p-6 lg:grid-cols-3">
        {allCampaigns.map((campaign: any) => (
          <div
            key={campaign.pubId.toString()}
            className="group cursor-pointer overflow-hidden rounded-lg"
          >
            <img
              className="h-60 w-full object-cover transition-transform duration-200 ease-in-out group-hover:scale-105"
              src={campaign.image_link}
            />
            <div className="flex flex-col justify-between bg-white p-5">
              <div>
                <p className="text-lg font-bold">{campaign.name}</p>
                <p className="text-xs">{campaign.description}</p>
                <p className="mt-1 flex items-center text-sm">
                  Amount raised: {campaign.amount_donated.toString()}
                  <span className="flex space-x-1">
                    <img
                      className="ml-2 object-contain"
                      src="/solana-sol-logo.png"
                      height={18}
                      width={18}
                    />
                    <span>SOL</span>
                  </span>
                </p>
              </div>
              <div className="flex flex-col items-center justify-between">
                <input
                  className="mt-1 mb-2 block w-full rounded-md border p-2 text-sm shadow outline-none ring-violet-600 focus:ring-2 "
                  placeholder="Amount to donate"
                  type="text"
                />
                <div className="mx-auto flex items-center justify-between space-x-8">
                  <button className="rounded bg-violet-700 py-3 px-6 text-xs font-bold text-white shadow  outline-none hover:bg-violet-800 focus:outline-none focus:ring focus:ring-violet-600 active:bg-violet-900 sm:py-2 sm:px-4">
                    Donate
                  </button>
                  <button className="rounded bg-violet-700  py-3 px-6 text-xs font-bold text-white shadow outline-none hover:bg-violet-800 focus:outline-none focus:ring focus:ring-violet-600 active:bg-violet-900 sm:py-2 sm:px-4">
                    Withdraw
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Home
