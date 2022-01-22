import { Box } from "@chakra-ui/react";
import React from "react";

export const Glass: React.FC = ({ children }) => (
  <Box position="relative">
    <Box
      position="absolute"
      inset={-0.5}
      bg="pink.400"
      borderRadius="md"
      filter="blur(10px)"
      bgGradient="linear(to-l, pink.400, orange.400)"
      opacity={0.1}
    />
    <Box
      position="relative"
      backdropFilter="blur(5px)"
      bg="whiteAlpha.100"
      borderRadius="md"
      border="solid"
      borderWidth="1px"
      borderColor="whiteAlpha.100"
      p="10"
      my="5"
    >
      {children}
    </Box>
  </Box>
);
