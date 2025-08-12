import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiConfig, createConfig } from 'wagmi';
import { polygon } from 'wagmi/chains';
import { http } from 'viem';
import { metaMask, injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AirdropUI } from './AirdropUI';
import './index.css'

// Create a client
const queryClient = new QueryClient();

// Configure wagmi for Airdrop UI
const wagmiConfig = createConfig({
  chains: [polygon],
  connectors: [
    metaMask(),
    injected()
  ],
  transports: {
    [polygon.id]: http(),
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={wagmiConfig}>
        <AirdropUI />
      </WagmiConfig>
    </QueryClientProvider>
  </React.StrictMode>,
)
