import { supabase } from "../lib/supabase";

export type Player = {
  id: string;
  name: string;
  category: RankingCategory;
  points: number;
  created_at?: string;
  updated_at?: string;
};

export type RankingCategory = "sistemico" | "operacional";

export const rankingCategoryOptions = [
  { value: "sistemico", label: "Sistemico" },
  { value: "operacional", label: "Operacional" },
] satisfies Array<{ value: RankingCategory; label: string }>;

const PLAYERS_TABLE = "kaizen_players";
const PLAYER_FIELDS = "id,name,category,points,created_at,updated_at";

export async function listPlayers(category: RankingCategory) {
  const { data, error } = await supabase
    .from(PLAYERS_TABLE)
    .select(PLAYER_FIELDS)
    .eq("category", category)
    .order("points", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

export async function createPlayer(name: string, category: RankingCategory) {
  const { data, error } = await supabase
    .from(PLAYERS_TABLE)
    .insert({ name, category, points: 0 })
    .select(PLAYER_FIELDS)
    .single();

  if (error) throw error;

  return data;
}

export async function deletePlayer(id: string) {
  const { error } = await supabase.from(PLAYERS_TABLE).delete().eq("id", id);

  if (error) throw error;
}

export async function updatePlayerName(id: string, name: string) {
  const { data, error } = await supabase
    .from(PLAYERS_TABLE)
    .update({ name })
    .eq("id", id)
    .select(PLAYER_FIELDS)
    .single();

  if (error) throw error;

  return data;
}

export async function updatePlayerPoints(id: string, points: number) {
  const { data, error } = await supabase
    .from(PLAYERS_TABLE)
    .update({ points })
    .eq("id", id)
    .select(PLAYER_FIELDS)
    .single();

  if (error) throw error;

  return data;
}

export async function replacePlayerScores(players: Player[]) {
  const updates = players.map(({ id, points }) => ({ id, points }));
  const { error } = await supabase.from(PLAYERS_TABLE).upsert(updates);

  if (error) throw error;
}
