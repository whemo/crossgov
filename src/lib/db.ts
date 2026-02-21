import fs from 'fs'
import path from 'path'
import { CrossProposal } from './types'

const DB_PATH = path.join(process.cwd(), 'src/data/proposals.json')

// Read all cross-proposals
export function getAllCrossProposals(): CrossProposal[] {
  const data = fs.readFileSync(DB_PATH, 'utf-8')
  return JSON.parse(data)
}

// Get one by ID
export function getCrossProposal(id: string): CrossProposal | undefined {
  return getAllCrossProposals().find(p => p.id === id)
}

// Save a new proposal
export function saveCrossProposal(proposal: CrossProposal) {
  const all = getAllCrossProposals()
  all.push(proposal)
  fs.writeFileSync(DB_PATH, JSON.stringify(all, null, 2))
}

// Update existing proposal
export function updateCrossProposal(id: string, updates: Partial<CrossProposal>) {
  const all = getAllCrossProposals()
  const index = all.findIndex(p => p.id === id)
  if (index !== -1) {
    all[index] = { ...all[index], ...updates }
    fs.writeFileSync(DB_PATH, JSON.stringify(all, null, 2))
  }
}

// Delete by ID
export function deleteCrossProposal(id: string): boolean {
  const all = getAllCrossProposals()
  const filtered = all.filter(p => p.id !== id)
  if (filtered.length === all.length) return false
  fs.writeFileSync(DB_PATH, JSON.stringify(filtered, null, 2))
  return true
}
