use std::borrow::BorrowMut;

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};

use borsh::{BorshDeserialize, BorshSerialize};

//Every solana program has one entry point and
//it is a convention to name it `process_instruction`.

//PROGRAM_ID=HEU8dhHz4oegHFSa2RJtg7WFFGwJX4rTXDB9ihgecZY9

fn process_instrcution(
    // It is the id for representing the solana program (a.k.a smart_contract)
    program_id: &Pubkey,
    // Passing metadata of account that we want to work with.
    // We can pass as many as we want since we have declared it as an array.
    accounts: &[AccountInfo],
    // This is the data that we will process for our instruction.
    instruction_data: &[u8],
) -> ProgramResult {
    if instruction_data.len() == 0 {
        return Err(ProgramError::InvalidInstructionData);
    }

    match instruction_data[0] {
        0 => {
            return create_campaign(
                program_id,
                accounts,
                &instruction_data[1..instruction_data.len()],
            )
        }
        1 => {
            return withdraw(
                program_id,
                accounts,
                &instruction_data[1..instruction_data.len()],
            )
        }

        2 => {
            return donate(
                program_id,
                accounts,
                &instruction_data[1..instruction_data.len()],
            )
        }
        _ => Err(ProgramError::InvalidInstructionData),
    }
}

entrypoint!(process_instrcution);

#[derive(BorshSerialize, BorshDeserialize, Debug)]
struct CampaignDetails {
    pub admin: Pubkey,
    pub name: String,
    pub description: String,
    pub image_link: String,
    pub amount_donated: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
struct WithdrawRequest {
    pub amount: u64,
}

fn create_campaign(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    //accounts is an array of accounts related to this program
    let accounts_iter = &mut accounts.iter();

    // This account should be owned by the solana program.
    let program_owner_account = next_account_info(accounts_iter)?;

    // This account allows transactions such as sign to the campaign creator
    let campaign_creator_account = next_account_info(accounts_iter)?;

    //We are now throwing error if the campain_creator account is not the signer
    if !campaign_creator_account.is_signer {
        msg!("Campaign creator should be the signer");
        return Err(ProgramError::IncorrectProgramId);
    }

    //We make sure that the program_id of the program is the owner of of this program
    if program_owner_account.owner != program_id {
        msg!("program owner account isn't owned by program!");
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut campaign_data = CampaignDetails::try_from_slice(&instruction_data)
        .expect("Error deserializing");

    //A Campaign should be created only by the admin of this program.
    if campaign_data.admin != *campaign_creator_account.key {
        msg!("Invalid instruction data");
        return Err(ProgramError::InvalidInstructionData);
    }

    //rent exemption is to make sure that the program is not removed off the onchain so we pass the minimum amount of lamports for it to be kept in the onchain.
    let rent_exemption = Rent::get()?.minimum_balance(program_owner_account.data_len());

    if **program_owner_account.lamports.borrow() < rent_exemption {
        msg!("The balance of program_owner_account shoould be more than rent_exemption");
        return Err(ProgramError::InsufficientFunds);
    }

    campaign_data.amount_donated = 0;

    //Serializing the campaign data
    campaign_data.serialize(&mut &mut program_owner_account.try_borrow_mut_data()?[..])?;

    Ok(())
}

fn withdraw(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    // This account should be owned by the solana program.
    let program_owner_account = next_account_info(accounts_iter)?;

    // This account allows transactions such as sign to the campaign creator
    let admin_account = next_account_info(accounts_iter)?;

    //We make sure that the program_id of the program is the owner of of this program
    if program_owner_account.owner != program_id {
        msg!("program owner account isn't owned by program!");
        return Err(ProgramError::IncorrectProgramId);
    }

    //We want only the admin to withdraw the fund
    if !admin_account.is_signer {
        msg!("admin should be the signer");
        return Err(ProgramError::IncorrectProgramId);
    }

    let campaign_data = CampaignDetails::try_from_slice(*program_owner_account.data.borrow())
        .expect("Error deserializing");

    // Only admin account can withdraw the amount from the program
    if campaign_data.admin != *admin_account.key {
        msg!("Only the account admin can withdraw");
        return Err(ProgramError::InvalidAccountData);
    }

    let campaign_data = WithdrawRequest::try_from_slice(&instruction_data)
        .expect("Instruction data serialization didn't work");

    let rent_exemption = Rent::get()?.minimum_balance(program_owner_account.data_len());

    if **program_owner_account.lamports.borrow() - rent_exemption < campaign_data.amount {
        msg!("Insufficent balance");
        return Err(ProgramError::InsufficientFunds);
    }

    **program_owner_account.try_borrow_mut_lamports()? -= campaign_data.amount;
    **admin_account.try_borrow_mut_lamports()? += campaign_data.amount;

    Ok(())
}
fn donate(program_id: &Pubkey, accounts: &[AccountInfo], instruction_data: &[u8]) -> ProgramResult {

    let accounts_iter = &mut accounts.iter();
    let program_owner_account = next_account_info(accounts_iter)?;
    let donator_program_account = next_account_info(accounts_iter)?;
    let donator = next_account_info(accounts_iter)?;

    if program_owner_account.owner != program_id {
        msg!("writing_account isn't owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }
    if donator_program_account.owner != program_id {
        msg!("donator_program_account isn't owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }
    if !donator.is_signer {
        msg!("donator should be signer");
        return Err(ProgramError::IncorrectProgramId);
    }


    let mut campaign_data = CampaignDetails::try_from_slice(*program_owner_account.data.borrow())
    .expect("Error deserializing");

    campaign_data.amount_donated += **donator_program_account.lamports.borrow();

    **program_owner_account.try_borrow_mut_lamports()? += **donator_program_account.lamports.borrow();
    **donator_program_account.try_borrow_mut_lamports()? = 0;

    campaign_data.serialize(&mut &mut program_owner_account.try_borrow_mut_data()?[..])?;

    Ok(())
}
