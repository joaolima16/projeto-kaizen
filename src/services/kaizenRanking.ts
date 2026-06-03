import { supabase } from "../lib/supabase";

export type Player = {
  id: string;
  name: string;
  points: number;
  created_at?: string;
  updated_at?: string;
};

const PLAYERS_TABLE = "kaizen_players";

export async function listPlayers() {
  const { data, error } = await supabase
    .from(PLAYERS_TABLE)
    .select("id,name,points,created_at,updated_at")
    .order("points", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

export async function createPlayer(name: string) {
  const { data, error } = await supabase
    .from(PLAYERS_TABLE)
    .insert({ name, points: 0 })
    .select("id,name,points,created_at,updated_at")
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
    .select("id,name,points,created_at,updated_at")
    .single();

  if (error) throw error;

  return data;
}

export async function updatePlayerPoints(id: string, points: number) {
  const { data, error } = await supabase
    .from(PLAYERS_TABLE)
    .update({ points })
    .eq("id", id)
    .select("id,name,points,created_at,updated_at")
    .single();

  if (error) throw error;

  return data;
}

export async function replacePlayerScores(players: Player[]) {
  const updates = players.map(({ id, points }) => ({ id, points }));
  const { error } = await supabase.from(PLAYERS_TABLE).upsert(updates);

  if (error) throw error;
}
