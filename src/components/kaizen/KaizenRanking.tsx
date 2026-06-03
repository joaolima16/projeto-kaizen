import { useEffect, useRef, useState, type DragEvent } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import {
  createPlayer,
  deletePlayer,
  listPlayers,
  replacePlayerScores,
  type Player,
  updatePlayerName,
  updatePlayerPoints,
} from "../../services/kaizenRanking";
import "./KaizenRanking.css";

type MedalProps = {
  position: number;
};

function Medal({ position }: MedalProps) {
  if (position === 1) return <span className="kaizen-ranking__medal">1</span>;
  if (position === 2) return <span className="kaizen-ranking__medal">2</span>;
  if (position === 3) return <span className="kaizen-ranking__medal">3</span>;

  return <span className="kaizen-ranking__position">#{position}</span>;
}

function getCardClassName(position: number, isDragging: boolean, isDragOver: boolean) {
  const modifiers = [
    position === 1 && "kaizen-ranking__card--first",
    position === 2 && "kaizen-ranking__card--second",
    position === 3 && "kaizen-ranking__card--third",
    isDragging && "kaizen-ranking__card--dragging",
    isDragOver && "kaizen-ranking__card--drag-over",
  ].filter(Boolean);

  return ["kaizen-ranking__card", ...modifiers].join(" ");
}

function sorted(list: Player[]) {
  return [...list].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

export default function KaizenRanking() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingPoints, setPendingPoints] = useState<Record<string, string>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadPlayers();
    loadSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
      checkAdmin(session?.user.id);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function loadPlayers() {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      setErrorMessage("");
      setPlayers(await listPlayers());
    } catch (error) {
      console.error(error);
      setErrorMessage("Nao foi possivel carregar o ranking.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSession() {
    const { data } = await supabase.auth.getSession();
    setIsLoggedIn(Boolean(data.session?.user));
    await checkAdmin(data.session?.user.id);
  }

  async function checkAdmin(userId?: string) {
    if (!userId) {
      setIsAdmin(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    setIsAdmin(!error && data?.role === "admin");
  }

  async function runSave(action: () => Promise<void>) {
    try {
      setSaving(true);
      setErrorMessage("");
      await action();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error(error);
      setErrorMessage("Nao foi possivel salvar a alteracao.");
    } finally {
      setSaving(false);
    }
  }

  async function signIn() {
    if (!email.trim() || !password) return;

    try {
      setErrorMessage("");
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      setPassword("");
    } catch (error) {
      console.error(error);
      setErrorMessage("Login de admin invalido.");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setIsAdmin(false);
  }

  async function addPlayer() {
    if (!isAdmin || !newName.trim()) return;

    await runSave(async () => {
      const created = await createPlayer(newName.trim());
      setPlayers((current) => sorted([...current, created]));
      setNewName("");
      setShowAdd(false);
    });
  }

  async function removePlayer(id: string) {
    if (!isAdmin) return;

    await runSave(async () => {
      await deletePlayer(id);
      setPlayers((current) => current.filter((player) => player.id !== id));
    });
  }

  function changePoints(id: string, delta: number) {
    if (!isAdmin) return;

    const player = players.find((item) => item.id === id);
    if (!player) return;

    const currentValue = pendingPoints[id] ?? String(player.points);
    const currentPoints = Number.parseFloat(currentValue);
    const basePoints = Number.isNaN(currentPoints) ? player.points : currentPoints;
    const points = Math.max(0, Math.round((basePoints + delta) * 10) / 10);

    setPendingPoints((current) => ({
      ...current,
      [id]: String(points),
    }));
  }

  function setPoints(id: string, value: string) {
    if (!isAdmin) return;

    setPendingPoints((current) => ({
      ...current,
      [id]: value,
    }));
  }

  async function confirmPoints(id: string) {
    if (!isAdmin) return;

    const value = pendingPoints[id];
    if (value === undefined) return;

    const points = Number.parseFloat(value);
    if (Number.isNaN(points) || points < 0) return;

    await runSave(async () => {
      const updated = await updatePlayerPoints(id, points);
      setPlayers((current) =>
        sorted(current.map((player) => (player.id === id ? updated : player))),
      );
      setPendingPoints((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    });
  }

  function startEditName(player: Player) {
    if (!isAdmin) return;

    setEditingId(player.id);
    setEditingName(player.name);
  }

  async function confirmEditName(id: string) {
    if (!isAdmin || !editingName.trim()) return;

    await runSave(async () => {
      const updated = await updatePlayerName(id, editingName.trim());
      setPlayers((current) =>
        sorted(current.map((player) => (player.id === id ? updated : player))),
      );
      setEditingId(null);
    });
  }

  function onDragStart(id: string) {
    if (!isAdmin) return;
    setDragId(id);
  }

  function onDragOver(event: DragEvent<HTMLDivElement>, id: string) {
    if (!isAdmin) return;
    event.preventDefault();
    setDragOverId(id);
  }

  async function onDrop(targetId: string) {
    if (!isAdmin || !dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }

    const sortedList = sorted(players);
    const fromIndex = sortedList.findIndex((player) => player.id === dragId);
    const toIndex = sortedList.findIndex((player) => player.id === targetId);

    if (fromIndex < 0 || toIndex < 0) return;

    const reordered = [...sortedList];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const maxPoints = reordered.reduce((max, player) => Math.max(max, player.points), 0);
    const adjusted = reordered.map((player, index) => ({
      ...player,
      points: Math.max(0, maxPoints - index * 0.5),
    }));

    await runSave(async () => {
      await replacePlayerScores(adjusted);
      setPlayers(adjusted);
    });

    setDragId(null);
    setDragOverId(null);
  }

  const sortedPlayers = sorted(players);

  if (loading) {
    return (
      <div className="kaizen-ranking kaizen-ranking--loading">
        <div className="kaizen-ranking__loading-text">Carregando ranking...</div>
      </div>
    );
  }

  return (
    <div className="kaizen-ranking">
      <div className="kaizen-ranking__header">
        <div className="kaizen-ranking__badge">Melhoria Continua</div>
        <h1 className="kaizen-ranking__title">Ranking Kaizen</h1>
        <p className="kaizen-ranking__subtitle">
          {isAdmin
            ? "Modo admin ativo: edite nomes, pontos e participantes."
            : "Visualizacao publica do ranking de pontos Kaizen."}
        </p>

        <div className="kaizen-ranking__admin-panel">
          {isLoggedIn ? (
            <>
              <span className="kaizen-ranking__admin-status">
                {isAdmin ? "Admin conectado" : "Usuario sem permissao de edicao"}
              </span>
              <button className="kaizen-ranking__small-button" onClick={signOut} type="button">
                Sair
              </button>
            </>
          ) : (
            <>
              <input
                className="kaizen-ranking__admin-input"
                placeholder="email admin"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <input
                className="kaizen-ranking__admin-input"
                placeholder="senha"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") signIn();
                }}
              />
              <button className="kaizen-ranking__small-button" onClick={signIn} type="button">
                Entrar
              </button>
            </>
          )}
        </div>

        {!isSupabaseConfigured && (
          <div className="kaizen-ranking__error">
            Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.
          </div>
        )}

        {errorMessage && <div className="kaizen-ranking__error">{errorMessage}</div>}

        {(saved || saving) && (
          <div className="kaizen-ranking__saved-badge">
            {saving ? "Salvando..." : "Salvo automaticamente"}
          </div>
        )}
      </div>

      <div className="kaizen-ranking__container">
        {sortedPlayers.length === 0 && (
          <div className="kaizen-ranking__empty">
            {isAdmin ? "Nenhum participante ainda. Adicione o primeiro." : "Nenhum participante cadastrado."}
          </div>
        )}

        {sortedPlayers.map((player, index) => {
          const position = index + 1;
          const pendingPointValue = pendingPoints[player.id];
          const pointInputValue = pendingPointValue ?? player.points;
          const hasPendingPoints =
            pendingPointValue !== undefined &&
            Number.parseFloat(pendingPointValue) !== player.points;

          return (
            <div
              key={player.id}
              className={getCardClassName(
                position,
                dragId === player.id,
                dragOverId === player.id,
              )}
              draggable={isAdmin}
              onDragStart={() => onDragStart(player.id)}
              onDragOver={(event) => onDragOver(event, player.id)}
              onDrop={() => onDrop(player.id)}
              onDragEnd={() => {
                setDragId(null);
                setDragOverId(null);
              }}
            >
              <div className="kaizen-ranking__rank">
                <Medal position={position} />
              </div>

              <div className="kaizen-ranking__name-block">
                {editingId === player.id ? (
                  <input
                    autoFocus
                    className="kaizen-ranking__name-input"
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    onBlur={() => confirmEditName(player.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") confirmEditName(player.id);
                      if (event.key === "Escape") setEditingId(null);
                    }}
                  />
                ) : (
                  <>
                    <div
                      className="kaizen-ranking__name"
                      onClick={() => startEditName(player)}
                      title={isAdmin ? "Clique para editar o nome" : undefined}
                    >
                      {player.name}
                    </div>
                    {isAdmin && (
                      <div className="kaizen-ranking__name-hint">clique para renomear</div>
                    )}
                  </>
                )}
              </div>

              <div className="kaizen-ranking__points-block">
                {isAdmin && (
                  <button
                    className="kaizen-ranking__points-button kaizen-ranking__points-button--red"
                    onClick={() => changePoints(player.id, -0.1)}
                    title="-0.1 pontos"
                    type="button"
                  >
                    -
                  </button>
                )}

                <div className="kaizen-ranking__points-input-wrapper">
                  {isAdmin ? (
                    <input
                      className="kaizen-ranking__points-input"
                      type="number"
                      min="0"
                      step="0.1"
                      value={pointInputValue}
                      onChange={(event) => setPoints(player.id, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") confirmPoints(player.id);
                        if (event.key === "Escape") {
                          setPendingPoints((current) => {
                            const next = { ...current };
                            delete next[player.id];
                            return next;
                          });
                        }
                      }}
                      title="Edite os pontos"
                    />
                  ) : (
                    <div className="kaizen-ranking__points-readonly">{player.points}</div>
                  )}
                  <div className="kaizen-ranking__points-label">pts</div>
                </div>

                {isAdmin && (
                  <button
                    className="kaizen-ranking__points-button kaizen-ranking__points-button--green"
                    onClick={() => changePoints(player.id, 0.1)}
                    title="+0.1 pontos"
                    type="button"
                  >
                    +
                  </button>
                )}

                {isAdmin && hasPendingPoints && (
                  <button
                    className="kaizen-ranking__points-confirm-button"
                    onClick={() => confirmPoints(player.id)}
                    title="Confirmar pontuacao"
                    type="button"
                  >
                    Confirmar
                  </button>
                )}
              </div>

              {isAdmin && (
                <button
                  className="kaizen-ranking__delete-button"
                  onClick={() => removePlayer(player.id)}
                  title="Remover participante"
                  type="button"
                >
                  x
                </button>
              )}
            </div>
          );
        })}

        {isAdmin && (
          <div className="kaizen-ranking__add-section">
            {!showAdd ? (
              <button
                className="kaizen-ranking__add-button"
                onClick={() => {
                  setShowAdd(true);
                  window.setTimeout(() => nameInputRef.current?.focus(), 50);
                }}
                type="button"
              >
                + Adicionar participante
              </button>
            ) : (
              <div className="kaizen-ranking__add-form">
                <input
                  ref={nameInputRef}
                  className="kaizen-ranking__add-input"
                  placeholder="Nome do participante..."
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addPlayer();
                    if (event.key === "Escape") {
                      setShowAdd(false);
                      setNewName("");
                    }
                  }}
                />
                <button
                  className="kaizen-ranking__confirm-button"
                  onClick={addPlayer}
                  type="button"
                >
                  Adicionar
                </button>
                <button
                  className="kaizen-ranking__cancel-button"
                  onClick={() => {
                    setShowAdd(false);
                    setNewName("");
                  }}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
