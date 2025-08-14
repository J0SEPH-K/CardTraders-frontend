const BAN_WORDS = ["직접 결제","계좌로","현금","카카오페이 직접","네이버페이 직접","토스 직접"];
export const shouldDisconnect = (msg:string)=> BAN_WORDS.some(w=> msg.toLowerCase().includes(w.toLowerCase()));
