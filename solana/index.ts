import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'
import {
  WalletAdapterNetwork,
  WalletNotConnectedError,
} from '@solana/wallet-adapter-base'
import Wallet from '@project-serum/sol-wallet-adapter'

import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  Connection,
  clusterApiUrl,
} from '@solana/web3.js'
import { deserialize, serialize } from 'borsh'

const programId = new PublicKey('HEU8dhHz4oegHFSa2RJtg7WFFGwJX4rTXDB9ihgecZY9')

const network = WalletAdapterNetwork.Devnet

const cluster = clusterApiUrl(network)


const wallet = new Wallet('https://www.sollet.io', cluster)

const connection = new Connection(cluster, 'confirmed')

// returns a transaction
export const setPayerAndBlockhashTransaction = async (
  instructions: Array<TransactionInstruction>
) => {
  const transaction = new Transaction()
  instructions.forEach((element) => {
    transaction.add(element)
  })

  if (!wallet.publicKey) throw new WalletNotConnectedError()
  //getting the publickey from the wallet and setting the tx fee payer
  transaction.feePayer = wallet.publicKey!

  //setting the recent/latest blockhash
  let hash = await connection.getLatestBlockhash()
  transaction.recentBlockhash = hash.blockhash
  return transaction
}

//returns the signature
export const signAndSendTransaction = async (transaction: Transaction) => {
  try {
    console.log('Start Signing and Sending the TX.')

    let signedTransaction = await wallet.signTransaction(transaction)
    console.log('Tx signed.')

    console.log(signedTransaction)
    let signature = await connection.sendRawTransaction(
      signedTransaction.serialize()
    )

    console.log(signature)
    return signature
  } catch (err) {
    console.log(err)
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

export const checkWallet = async () => {
  if (!wallet.connected) {
    await wallet.connect()
  }
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

export const withdraw = async (campaignPubKey: any, amount: number) => {
  await checkWallet()
  let withdrawRequest = new WithDrawRequest(amount)
  let data = serialize(WithDrawRequest.schema, withdrawRequest)
  let data_to_send = new Uint8Array([1, ...data])

  const instructionToOurProgram = new TransactionInstruction({
    keys: [
      { pubkey: campaignPubKey, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey!, isSigner: true, isWritable: true },
    ],
    programId: programId,
    data: data_to_send as Buffer,
  })

  const trans = await setPayerAndBlockhashTransaction([instructionToOurProgram])

  const signature = await signAndSendTransaction(trans)

  const result = await connection.confirmTransaction(signature!)

  console.log('end sendMessage', result)
}
