import { CanonicalNote } from '../types/note';
import notesJson from './notes.json';

export const CANONICAL_MOCK_NOTES: CanonicalNote[] = notesJson as unknown as CanonicalNote[];
