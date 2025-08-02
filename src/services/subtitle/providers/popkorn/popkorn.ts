import axios from "axios";

const BASE_URL = "https://api.pkdirectdl.xyz/api";

export interface Subtitle {
  id: number;
  uri: string;
  file_name: string;
  quality: string;
  resolution: string;
  size: string;
  created_at: string;
}

export async function getMovieSubtitles(imdbId: string): Promise<Subtitle[]> {
  const url = `${BASE_URL}/movie/${imdbId}/subtitle/`;
  const res = await axios.get<Subtitle[]>(url);
  return res.data;
}

export async function getSeriesSubtitles(imdbId: string, season: number, episode: number): Promise<Subtitle[]> {
  const url = `${BASE_URL}/series/${imdbId}/subtitle/?episode_no=${episode}&season_no=${season}`;
  const res = await axios.get<Subtitle[]>(url);
  return res.data;
}
