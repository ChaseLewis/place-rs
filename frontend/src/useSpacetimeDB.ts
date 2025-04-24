import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DbConnection, ErrorContext } from "./spacetimedb";

let SPACETIME_DB_CONNECTION: DbConnection|null = null;

export const useSpacetimeDB = (props: { url: string }) => {


    const [conn,setConn] = useState<DbConnection|null>(SPACETIME_DB_CONNECTION);
    const [connected,setConnected] = useState<boolean>(conn?.isActive || false);
    const [identity,setIdentity] = useState<Identity|null>(conn?.identity || null);

    const onConnect = useCallback((conn: DbConnection,identity: Identity,token: string) => {
        setIdentity(identity);
        setConnected(true);
        localStorage.setItem("authToken",token);
        console.log("Connected to SpacetimeDB with identity ",identity.toHexString());
        setConn(conn);
    },[]);

    const onDisconnect = useCallback(() => {
        console.log('Disconnected from SpacetimeDB');
        setConnected(false);
    },[]);

    const onConnectError = useCallback((_ctx: ErrorContext, err: Error) => {
        console.error("Failed to connect to SpacetimeDB: ",err);
    },[]);

    useEffect(() => {
        if(!conn?.isActive) {
            DbConnection.builder()
            .withUri(props.url)
            .withModuleName("place")
            .withToken(localStorage.getItem("authToken") || "")
            .onConnect(onConnect)
            .onDisconnect(onDisconnect)
            .onConnectError(onConnectError)
            .build();
        }
    },[props.url,onConnect,onDisconnect,onConnectError]);

    return useMemo(() => {
        return { conn, identity, connected };
        
    },[conn,identity,connected])
}