import { Transaction, Settlement, TransactionType } from './models';

export interface LedgerBalance {
    amountOwedToMePaise: number;
    amountIOwePaise: number;
    netBalancePaise: number;
    totalSharedPaidByMePaise: number;
    totalSharedPaidByPartnerPaise: number;
    totalSettlementsPaidByMePaise: number;
    totalSettlementsPaidByPartnerPaise: number;
}

/**
 * Universal, robust helper across Android & iOS to check if a transaction was paid by the current user.
 * Correctly accounts for real Google Auth UIDs, legacy test tokens (test_partner_khushal, test_user_dev),
 * partner_ prefixes, and explicit notes.
 */
export function isTransactionPaidByMe(
    tx: Transaction,
    currentUserId: string,
    partnerId: string = '',
    currentUserEmail: string = '',
    currentUserName: string = '',
    partnerName: string = ''
): boolean {
    const paidBy = (tx.paidBy || '').trim();
    const isUserDevanshu = (currentUserEmail.toLowerCase().includes('devanshu') ||
        currentUserName.toLowerCase().includes('devanshu') ||
        currentUserId === 'test_user_dev');
    const isUserKhushal = (currentUserEmail.toLowerCase().includes('khushal') ||
        currentUserName.toLowerCase().includes('khushal') ||
        currentUserId === 'test_partner_khushal');

    if (paidBy) {
        // Direct UID match
        if (paidBy === currentUserId) return true;
        if (partnerId && paidBy === partnerId) return false;

        // Legacy / test tokens for Devanshu
        if (paidBy === 'test_user_dev' || paidBy.toLowerCase().includes('devanshu')) {
            return isUserDevanshu || !isUserKhushal;
        }

        // Legacy / test tokens for Khushal / Partner
        if (
            paidBy === 'test_partner_khushal' ||
            paidBy.toLowerCase() === 'khushal' ||
            paidBy.toLowerCase().includes('khushal') ||
            (partnerName && paidBy.toLowerCase() === partnerName.toLowerCase()) ||
            paidBy.toLowerCase() === 'partner' ||
            paidBy.startsWith('partner_')
        ) {
            return isUserKhushal;
        }

        if (paidBy.toLowerCase() === 'you' || paidBy.toLowerCase() === 'me') {
            return tx.createdBy === currentUserId;
        }

        return paidBy === currentUserId;
    }

    // If paidBy is blank, inspect notes and createdBy
    const notesLower = (tx.notes || '').toLowerCase();
    if (notesLower.includes('khushal paid') || notesLower.includes('partner paid')) {
        return isUserKhushal;
    }
    if (notesLower.includes('devanshu paid') || notesLower.includes('you paid')) {
        return isUserDevanshu || !isUserKhushal;
    }

    const createdBy = (tx.createdBy || '').trim();
    if (createdBy) {
        if (createdBy === currentUserId) return true;
        if (partnerId && createdBy === partnerId) return false;

        if (createdBy.toLowerCase().includes('khushal') || createdBy.startsWith('partner_') || createdBy === 'test_partner_khushal') {
            return isUserKhushal;
        }
        if (createdBy.toLowerCase().includes('devanshu') || createdBy === 'test_user_dev') {
            return isUserDevanshu || !isUserKhushal;
        }
    }

    return createdBy === currentUserId;
}

export function isTransactionPersonalMine(
    tx: Transaction,
    currentUserId: string,
    partnerId: string = '',
    currentUserEmail: string = '',
    currentUserName: string = '',
    partnerName: string = ''
): boolean {
    if (!tx.personal) return false;
    const cleanPartnerName = (partnerName && partnerName !== 'Partner') ? partnerName : 'Khushal';
    const notesLower = (tx.notes || '').toLowerCase();

    if (notesLower.includes("partner's personal") || notesLower.includes(`${cleanPartnerName.toLowerCase()}'s personal`)) {
        const isUserKhushal = currentUserEmail.toLowerCase().includes('khushal') || currentUserName.toLowerCase().includes('khushal');
        return isUserKhushal;
    }

    const partnerShare = tx.splits?.find(s => s.userId === partnerId || s.userId.startsWith('partner_') || s.userId === 'test_partner_khushal')?.amountPaise || 0;
    const myShare = tx.splits?.find(s => s.userId === currentUserId || s.userId === 'test_user_dev')?.amountPaise || 0;
    if (partnerShare > 0 && myShare === 0) return false;
    if (myShare > 0 && partnerShare === 0) return true;

    return isTransactionPaidByMe(tx, currentUserId, partnerId, currentUserEmail, currentUserName, partnerName);
}

export function calculateNetBalance(
    currentUserId: string,
    transactions: Transaction[],
    settlements: Settlement[],
    partnerId: string = '',
    currentUserEmail: string = '',
    currentUserName: string = '',
    partnerName: string = ''
): LedgerBalance {
    let myTotalPaid = 0;
    let partnerTotalPaid = 0;

    for (const tx of transactions) {
        if (tx.isDeleted || tx.personal || tx.type === TransactionType.INCOME || tx.type === TransactionType.TRANSFER) continue;

        if (isTransactionPaidByMe(tx, currentUserId, partnerId, currentUserEmail, currentUserName, partnerName)) {
            myTotalPaid += tx.amountPaise;
        } else {
            partnerTotalPaid += tx.amountPaise;
        }
    }

    let myNetBalance = Math.floor((myTotalPaid - partnerTotalPaid) / 2);

    let settlementsByMe = 0;
    let settlementsByPartner = 0;

    for (const settlement of settlements) {
        const isSettlementByMe = settlement.paidBy === currentUserId ||
            (settlement.paidBy === 'test_user_dev' && (currentUserEmail.includes('devanshu') || currentUserName.includes('devanshu'))) ||
            (settlement.paidBy === 'test_partner_khushal' && (currentUserEmail.includes('khushal') || currentUserName.includes('khushal')));

        const isSettlementReceivedByMe = settlement.receivedBy === currentUserId ||
            (settlement.receivedBy === 'test_user_dev' && (currentUserEmail.includes('devanshu') || currentUserName.includes('devanshu'))) ||
            (settlement.receivedBy === 'test_partner_khushal' && (currentUserEmail.includes('khushal') || currentUserName.includes('khushal')));

        if (isSettlementByMe) {
            myNetBalance += settlement.amountPaise;
            settlementsByMe += settlement.amountPaise;
        } else if (isSettlementReceivedByMe) {
            myNetBalance -= settlement.amountPaise;
            settlementsByPartner += settlement.amountPaise;
        }
    }

    const owedToMe = myNetBalance > 0 ? myNetBalance : 0;
    const iOwe = myNetBalance < 0 ? -myNetBalance : 0;

    return {
        amountOwedToMePaise: owedToMe,
        amountIOwePaise: iOwe,
        netBalancePaise: myNetBalance,
        totalSharedPaidByMePaise: myTotalPaid,
        totalSharedPaidByPartnerPaise: partnerTotalPaid,
        totalSettlementsPaidByMePaise: settlementsByMe,
        totalSettlementsPaidByPartnerPaise: settlementsByPartner
    };
}
