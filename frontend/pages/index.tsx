import { Button, Container, Stack } from "@chakra-ui/react";
import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import IDOPool from "ido-pool";
import { setProvider, Provider, Program, web3 } from "@project-serum/anchor";
import useSWR from "swr";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import idoPoolIdl from "../idl/ido_pool.json";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { ComponentType } from "react";

const Countdown = dynamic<{}>(
  () => import("../components/Countdown").then(({ Countdown }) => Countdown),
  {
    ssr: false,
  }
);

const Home: NextPage = () => {
  return (
    <Container>
      <Countdown />
    </Container>
  );
};

export default Home;
