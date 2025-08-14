export type Listing = {
  id:string; title:string; description?:string;
  category:"sports"|"yugioh"|"pokemon"|"idol";
  sport?: "MLB"|"NBA"|"NFL"|"KBO"|"etc";
  year?: number; base?: string; card_type?: string; set_name?: string; grade?: string;
  is_verified:boolean; price?: number;
};
