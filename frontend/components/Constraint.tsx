import { Box, Center, Flex } from "@chakra-ui/react";

export const Constraint: React.FC = (props) => (
  <Center width="100%">
    <Flex
      mx={{ sm: "1em", md: "2em", lg: "6em" }}
      pt="10"
      pb="0"
      maxWidth="100em"
      width="100%"
    >
      {props.children}
    </Flex>
  </Center>
);
