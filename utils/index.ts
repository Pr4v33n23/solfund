import { WalletNotConnectedError } from '@solana/wallet-adapter-base'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import { deserialize, serialize } from 'borsh'
const { connection } = useConnection()
const { wallet, publicKey, sendTransaction, signTransaction } = useWallet()
const programId = new PublicKey(process.env.PROGRAM_ID!)

// returns a transaction
export const setPayerAndBlockhashTransaction = async (
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
export const signAndSendTransaction = async (transaction: Transaction) => {
  try {
    console.log('Start Signing and Sending the TX.')

    // @ts-ignore
    //! Temporary fix - signTransaction is acceptiong transaction variable
    let signedTransaction = await signTransaction(transaction)
    console.log('Tx signed.')

    let signature = await connection.sendRawTransaction(
      signedTransaction.serialize()
    )

    return signature
  } catch (err) {
    console.error(err)
    throw err
  }
}

class CampaignDetails {
  name: string
  description: string
  image_link: string
  admin: Buffer
  amount_donated: number

  constructor(
    name: string,
    description: string,
    image_link: string,
    admin: Buffer,
    amount_donated: number
  ) {
    ;(this.name = name),
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
          ['name', 'string'],
          ['description', 'string'],
          ['image_link', 'string'],
          ['amount_donated', 'u64'],
        ],
      },
    ],
  ])
}

const checkWallet = async () => {
  if (!wallet?.adapter.connected) {
    await wallet?.adapter.connect()
  }
}

export const createCampaign = async (
  name: string,
  description: string,
  image_link: string
) => {
  await checkWallet()

  const SEED_PRHASE = 'abcdef' + Math.random().toString()

  //creating an account to contain the data of the campaign
  let newAccount = await PublicKey.createWithSeed(
    publicKey!,
    SEED_PRHASE,
    programId
  )

  //setup campaign details
  let campaign = new CampaignDetails(
    name,
    description,
    image_link,
    publicKey?.toBuffer()!,
    0
  )

  let data = serialize(CampaignDetails.schema, campaign)

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
    data: data_to_send as Buffer,
  })

  const trans = await setPayerAndBlockhashTransaction([
    createProgramAccount,
    instructionToOurProgram,
  ])

  const signature = await signAndSendTransaction(trans)

  const result = await connection.confirmTransaction(signature)

  console.log('End SendMessage', result)
}
