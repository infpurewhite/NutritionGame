/** Game data assembled and validated at build time by build/vite-plugin-game-data.ts. */
declare module 'virtual:game-data' {
  const data: import('./domain/types.ts').GameData;
  export default data;
}
