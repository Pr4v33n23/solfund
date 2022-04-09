import { WalletNotConnectedError } from '@solana/wallet-adapter-base'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import { serialize } from 'borsh'
import React, { useCallback, useEffect, useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { Header } from '../../components/header/Header'

interface IFormInput {
  title: string
  description: string
  image_link: string
}

class CampaignDetails {
  title: string
  description: string
  image_link: string
  admin: Buffer
  amount_donated: number

  constructor(
    title: string,
    description: string,
    image_link: string,
    admin: Buffer,
    amount_donated: number
  ) {
    ;(this.title = title),
      (this.description = description),
      (this.image_link = image_link),
      (this.admin = admin),
      (this.amount_donated = amount_donated)
  }

  static schema: any = new Map([
    [
      CampaignDetails,
      {
        kind: 'struct',
        fields: [
          ['admin', [32]],
          ['title', 'string'],
          ['description', 'string'],
          ['image_link', 'string'],
          ['amount_donated', 'u64'],
        ],
      },
    ],
  ])
}

const Index: React.FC = () => {
  const { publicKey, signTransaction, connected } = useWallet()
  const { connection } = useConnection()

  const [walletConnected, setWalletConnected] = useState(false)

  useEffect(() => {
    const connectWallet = async () => {
      if (publicKey !== null) setWalletConnected(true)
    }

    if (!connected) setWalletConnected(false)

    connectWallet()
  })

  //TODO env variable not working
  const programId = new PublicKey(
    'HpUfRuwq697hGMvno28BZaAGBD6LVqS9Y3cP2dCsVZmz'
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitSuccessful },
  } = useForm<IFormInput>()

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

  const createCampaign = async (
    title: string,
    description: string,
    image_link: string
  ) => {
    const SEED_PRHASE = 'abcdef' + Math.random().toString()
    //creating an account to contain the data of the campaign
    let newAccount = await PublicKey.createWithSeed(
      publicKey!,
      SEED_PRHASE,
      programId
    )
    console.log(title, description, image_link)

    //setup campaign details
    let campaign = new CampaignDetails(
      title,
      description,
      image_link,
      publicKey?.toBuffer()!,
      0
    )
    console.log(campaign)

    let data = serialize(CampaignDetails.schema, campaign)

    console.log(data)

    let data_to_send = new Uint8Array([0.0, ...data])

    const lamports = await connection.getMinimumBalanceForRentExemption(
      data.length
    )

    const createProgramAccount = SystemProgram.createAccountWithSeed({
      fromPubkey: publicKey!,
      basePubkey: publicKey!,
      seed: SEED_PRHASE,
      newAccountPubkey: newAccount,
      lamports: lamports,
      space: data.length,
      programId: programId,
    })

    const instructionToOurProgram = new TransactionInstruction({
      keys: [
        { pubkey: newAccount, isSigner: false, isWritable: true },
        { pubkey: publicKey!, isSigner: true, isWritable: true },
      ],
      programId: programId,
      data: Buffer.from(data_to_send),
    })

    const trans = await setPayerAndBlockhashTransaction([
      createProgramAccount,
      instructionToOurProgram,
    ])

    const signature = await signAndSendTransaction(trans)

    const result = await connection.confirmTransaction(signature!)

    console.log('End SendMessage', result)
  }

  const onSubmit: SubmitHandler<IFormInput> = async ({
    title,
    description,
    image_link,
  }) => {
    try {
      await createCampaign(title, description, image_link)
      reset({ title: '', description: '', image_link: '' })
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <Header />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="my-10 mx-2 mb-10 flex max-w-2xl flex-col sm:mx-auto"
      >
        <h1 className="flex justify-center text-xl font-bold text-purple-500 sm:text-sm md:text-2xl">
          Create a new campaign
        </h1>
        <hr className="mt-2 py-3" />

        <label className="mb-5 block">
          <span className="text-white">Title</span>
          <input
            {...register('title', { required: false })}
            className="form-input mt-1 block w-full rounded border py-1 px-2 sm:py-2 sm:px-3 shadow outline-none ring-purple-500 focus:ring-2"
            placeholder="Dogs"
            type="text"
          />
        </label>

        <label className="mb-5 block">
          <span className="text-white">Description</span>
          <input
            {...register('description', { required: false })}
            className="form-input mt-1 block w-full rounded border py-1 px-2 sm:py-2 sm:px-3 shadow outline-none ring-purple-500 focus:ring-2"
            placeholder="Save dogs"
            type="text"
          />
        </label>

        <label className="mb-5 block">
          <span className="text-white">Image Link</span>
          <input
            {...register('image_link', { required: false })}
            className="form-input mt-1 block w-full rounded border py-1 px-2 sm:py-2 sm:px-3 shadow outline-none ring-purple-500 focus:ring-2"
            placeholder="https://i.natgeofe.com/n/4f5aaece-3300-41a4-b2a8-ed2708a0a27c/domestic-dog_thumb_2x1.jpg"
            type="text"
          />
        </label>
        {walletConnected ? (
          <input
            type="submit"
            className="focus:shadow-outline rounder cursor-pointer bg-purple-500  py-1 px-2 sm:py-2 sm:px-4 font-bold 
          text-white shadow hover:bg-purple-400 focus:outline-none "
          />
        ) : (
          <input
            type="submit"
            disabled={true}
            onClick={() => {
              reset()
            }}
            className="focus:shadow-outline rounder cursor-pointer bg-purple-500 py-2 px-4 font-bold 
        text-white shadow hover:bg-purple-400 focus:outline-none disabled:opacity-25"
          />
        )}
      </form>
    </div>
  )
}

export default Index
