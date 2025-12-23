cmake_minimum_required(VERSION 3.31)

find_package(cmake-pear REQUIRED PATHS node_modules/cmake-pear)

set(PEAR_WINDOWS_SIGN OFF)

project(pear_appling C CXX ASM)



add_pear_appling(
  pear_appling
  ID "3ysp1rtmrcmbinxk4ossegdx8hm85ptksdmo3u5xq3iwsmshtspy"
  LINK "pear://3ysp1rtmrcmbinxk4ossegdx8hm85ptksdmo3u5xq3iwsmshtspy"
  NAME "Oniri"
  VERSION 1.0.0
  AUTHOR "OniriCloud"
  DESCRIPTION "A secure, decentralized P2P tunneling application."

  MACOS_IDENTIFIER com.oniri.test
  MACOS_CATEGORY public.app-category.utilities
  # MACOS_SIGNING_IDENTITY "2718499D3FEA620C4E7BB467274BD07691CC2BDD"

  # WINDOWS_SIGNING_SUBJECT "<string>"
  # WINDOWS_SIGNING_THUMBPRINT <sha1>

  LINUX_CATEGORY Utility
)