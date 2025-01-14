import {
  Button,
  HStack,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useEffect } from 'react';
import { useConnect } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';

export default function SelectWalletModal({
  isOpen,
  closeModal,
}: {
  isOpen: boolean;
  closeModal: () => void;
}) {
  const {
    connectors,
    connect,
    isConnecting,
    isError,
    isConnected,
    pendingConnector,
  } = useConnect();

  const connectingToMetamask =
    pendingConnector instanceof InjectedConnector && isConnecting;

  useEffect(() => {
    if (isError || isConnected) {
      closeModal();
    }
  }, [isError, isConnected, closeModal]);
  return (
    <Modal isOpen={isOpen} onClose={closeModal} isCentered>
      <ModalOverlay />
      <ModalContent w="300px">
        <ModalHeader color="white">Select Wallet</ModalHeader>
        <ModalCloseButton
          _focus={{
            color: 'white',
            boxShadow: 'none',
          }}
        />
        <ModalBody paddingBottom="1.5rem">
          <VStack>
            <Button
              disabled={connectingToMetamask}
              variant="outline"
              onClick={() => {
                connect(connectors[0]);
              }}
              w="100%"
              size="md"
            >
              <HStack w="100%" justifyContent="center">
                {connectingToMetamask && <Spinner verticalAlign="middle" />}
                <Image
                  src="/wallets/metamask.svg"
                  alt="Metamask Logo"
                  width={25}
                  height={25}
                  borderRadius="3px"
                />
                <Text>Metamask</Text>
              </HStack>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                connect(connectors[1]);
              }}
              w="100%"
              size="md"
            >
              <HStack w="100%" justifyContent="center">
                <Image
                  src="/wallets/walletconnect.svg"
                  alt="Wallet Connect Logo"
                  width={26}
                  height={26}
                  borderRadius="3px"
                />
                <Text>Wallet Connect</Text>
              </HStack>
            </Button>
            {/* <Button
              variant="outline"
              onClick={() => {
                connect(connectors[2]);
                closeModal();
              }}
              w="100%"
            >
              <HStack w="100%" justifyContent="center">
                <Image
                  src="/wallets/frame.svg"
                  alt="Frame Logo"
                  width={25}
                  height={25}
                  borderRadius="3px"
                />
                <Text>Frame</Text>
              </HStack>
            </Button> */}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
