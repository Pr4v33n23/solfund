import { WalletNotConnectedError } from '@solana/wallet-adapter-base'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import { deserialize, serialize } from 'borsh'
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

class WithDrawRequest {
  amount: number

  constructor(amount: number) {
    this.amount = amount
  }

  static schema = new Map([
    [WithDrawRequest, { kind: 'struct', fields: [['amount', 'u64']] }],
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
  const LAMPORTS = 1000000000 // 1 lamport = 0.000000001 sol.
  const DECIMAL_ROUND_OFF = 2

  const [allCampaigns, setAllCampaigns] = useState([] as any)
  const [amount, setAmount] = useState(0)
  const [withdrawError, setWithdrawError] = useState(false)

  useEffect(() => {
    const campaigns = async () => {
      const onChainCampaigns = await getAllCampaigns()
      setAllCampaigns(onChainCampaigns)
    }
    campaigns()
  }, [])

  const programId = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!)

  const setPayerAndBlockhashTransaction = async (
    instructions: Array<TransactionInstruction>
  ) => {
    const transaction = new Transaction()
    instructions.forEach((element) => {
      transaction.add(element)
    })

    if (!publicKey) throw new WalletNotConnectedError()
    //getting the publickey from the wallet and setting the tx fee payer
    transaction.feePayer = publicKey!

    //setting the recent/latest blockhash
    let hash = await connection.getLatestBlockhash()
    transaction.recentBlockhash = hash.blockhash
    return transaction
  }

  //returns the signature
  const signAndSendTransaction = async (transaction: Transaction) => {
    try {
      console.log('Start Signing and Sending the TX.')

      let signedTransaction = await signTransaction!(transaction)
      console.log('Tx signed.')

      let signature = await connection.sendRawTransaction(
        signedTransaction.serialize()
      )

      return signature
    } catch (err) {
      console.log(err)
    }
  }

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

          amount_donated: x.account.lamports,
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
        { pubkey: campaignPubKey, isSigner: false, isWritable: true },
        { pubkey: newAccount, isSigner: false, isWritable: false },
        { pubkey: publicKey!, isSigner: true, isWritable: false },
      ],
      programId: programId,
      data: Buffer.from(new Uint8Array([2])),
    })

    const transaction = await setPayerAndBlockhashTransaction([
      createProgramAccount,
      instructionToOurProgram,
    ])

    const signature = await signAndSendTransaction(transaction)
    const result = await connection.confirmTransaction(signature!)

    console.log('end sendMessage', result)
  }

  const withdraw = async (campaignPubKey: any, amount: number) => {
    let withdrawRequest = new WithDrawRequest(amount)
    let data = serialize(WithDrawRequest.schema, withdrawRequest)

    let data_to_send = new Uint8Array([1, ...data])

    const instructionToOurProgram = new TransactionInstruction({
      keys: [
        { pubkey: campaignPubKey, isSigner: false, isWritable: true },
        { pubkey: publicKey!, isSigner: true, isWritable: true },
      ],
      programId: programId,
      data: Buffer.from(data_to_send),
    })

    const trans = await setPayerAndBlockhashTransaction([
      instructionToOurProgram,
    ])

    const signature = await signAndSendTransaction(trans)

    const result = await connection.confirmTransaction(signature!)

    console.log('end sendMessage', result)
  }

  const onDonate = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    pubKey: PublicKey
  ) => {
    e.preventDefault()
    const totalSol = amount * LAMPORTS

    try {
      await donateToCampaign(pubKey, totalSol)
      let updatedCampaigns = await getAllCampaigns()
      setAllCampaigns(updatedCampaigns)
    } catch (err) {
      console.error(err)
    }
  }

  const onWithdraw = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    pubKey: PublicKey
  ) => {
    e.preventDefault()
    try {
      const totalSol = amount * LAMPORTS
      await withdraw(pubKey, totalSol)
      let updatedCampaigns = await getAllCampaigns()
      setAllCampaigns(updatedCampaigns)
    } catch (err) {
      setWithdrawError(true)
      console.log(err)
    }
  }

  return (
    <div>
      <Header />

      {withdrawError && (
        <p className="mt-1 flex justify-center text-sm font-bold text-red-500">
          Only campaign owner can withdraw.
        </p>
      )}
      <div className=" grid grid-cols-1 gap-3 p-2 sm:grid-cols-2 md:gap-6 md:p-6 lg:grid-cols-3">
        {allCampaigns.map((campaign: any) => (
          <div
            key={campaign.pubId.toString()}
            className="group cursor-pointer overflow-hidden rounded-lg shadow shadow-violet-500"
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
                  Amount raised:
                  {parseFloat(
                    (campaign.amount_donated.toString() / LAMPORTS).toFixed(
                      DECIMAL_ROUND_OFF
                    )
                  )}
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
              <div className="m-2 flex items-center justify-between space-x-2 sm:space-x-2">
                <input
                  className="w-4/6 rounded-md border p-2 text-xs shadow outline-none ring-violet-600 focus:ring-2 "
                  placeholder="Amount to donate"
                  onChange={(e) => setAmount(parseInt(e.target.value))}
                  type="text"
                />
                <button
                  className="rounded bg-violet-700  px-6 py-2 text-xs font-bold text-white shadow outline-none hover:bg-violet-800 focus:outline-none focus:ring focus:ring-violet-600 active:bg-violet-900 sm:px-4 sm:py-2"
                  type="submit"
                  onClick={(e) => onDonate(e, campaign.pubId)}
                >
                  Donate
                </button>
              </div>
              <div className="m-2 flex items-center justify-between space-x-2 sm:space-x-4">
                <input
                  placeholder="Amount to withdraw"
                  className="w-4/6 rounded-md border p-2 text-xs shadow outline-none ring-violet-600 focus:ring-2 "
                  onChange={(e) => setAmount(parseInt(e.target.value))}
                  type="text"
                />
                <button
                  className="rounded bg-violet-700 px-4 py-2  text-xs font-bold text-white shadow outline-none hover:bg-violet-800 focus:outline-none focus:ring focus:ring-violet-600 active:bg-violet-900 sm:px-2 sm:py-2"
                  type="submit"
                  onClick={(e) => onWithdraw(e, campaign.pubId)}
                >
                  Withdraw
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Home
